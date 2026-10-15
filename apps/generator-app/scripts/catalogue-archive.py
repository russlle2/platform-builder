#!/usr/bin/env python3
"""Bounded, regular-file-only catalogue transport. No network or credential access."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import sys
import tarfile

CHUNK_BYTES = 256 * 1024 * 1024
MAX_BYTES = 40 * 1024 * 1024 * 1024
MAX_FILES = 500_000


def safe_path(value):
    if not isinstance(value, str) or len(value) > 1024:
        raise ValueError('Invalid member path')
    pieces = value.split('/')
    if any(not part or part in ('.', '..') or any(not (c.isascii() and (c.isalnum() or c in '._-')) for c in part) for part in pieces):
        raise ValueError('Unsafe member path')
    if any(part.rstrip('. ').upper().split('.')[0] in {'CON', 'PRN', 'AUX', 'NUL', *['COM' + str(i) for i in range(1, 10)], *['LPT' + str(i) for i in range(1, 10)]} or part.endswith('.') for part in pieces):
        raise ValueError('Nonportable member path')
    return value


def records(entries):
    if not isinstance(entries, list) or not 1 <= len(entries) <= MAX_FILES:
        raise ValueError('Invalid file count')
    result, folded, total = {}, set(), 0
    for entry in entries:
        name = safe_path(entry.get('path'))
        size, digest = entry.get('bytes'), entry.get('sha256')
        if type(size) is not int or size < 0 or not isinstance(digest, str) or len(digest) != 64 or any(c not in '0123456789abcdef' for c in digest):
            raise ValueError('Invalid file record')
        if name.casefold() in folded:
            raise ValueError('Duplicate or case-colliding path')
        folded.add(name.casefold())
        result[name] = entry
        total += size
    if total > MAX_BYTES:
        raise ValueError('Expanded catalogue is too large')
    for name in result:
        parent = Path(name).parent.as_posix()
        while parent != '.':
            if parent.casefold() in folded:
                raise ValueError('File/directory collision')
            parent = Path(parent).parent.as_posix()
    return result, total


class ChunkWriter:
    def __init__(self, root, limit=CHUNK_BYTES):
        self.root, self.limit = root, limit
        self.parts, self.handle, self.size = [], None, 0
        self.total, self.digest, self.part_digest = 0, hashlib.sha256(), None

    def write(self, data):
        count = len(data)
        self.digest.update(data)
        self.total += count
        while data:
            if self.handle is None:
                name = 'catalogue.part-%05d' % len(self.parts)
                self.handle = (self.root / name).open('xb')
                self.part_digest = hashlib.sha256()
                self.size = 0
            chunk = data[:self.limit - self.size]
            self.handle.write(chunk)
            self.part_digest.update(chunk)
            self.size += len(chunk)
            data = data[len(chunk):]
            if self.size == self.limit:
                self.finish_part()
        return count

    def finish_part(self):
        if self.handle is not None:
            self.handle.close()
            self.parts.append({'name': 'catalogue.part-%05d' % len(self.parts), 'bytes': self.size, 'sha256': self.part_digest.hexdigest()})
            self.handle = None

    def flush(self):
        if self.handle:
            self.handle.flush()


class HashReader:
    def __init__(self, handle):
        self.handle, self.digest = handle, hashlib.sha256()

    def read(self, size=-1):
        data = self.handle.read(size)
        self.digest.update(data)
        return data


def pack(spec, output, chunk_bytes=CHUNK_BYTES):
    expected, total = records(spec['files'])
    output.mkdir(parents=True, exist_ok=False)
    if shutil.disk_usage(output).free < total + 1024 * 1024 * 1024:
        raise ValueError('Insufficient transport disk headroom')
    writer = ChunkWriter(output, chunk_bytes)
    try:
        with gzip.GzipFile(filename='', mode='wb', fileobj=writer, mtime=0) as compressed:
            with tarfile.open(fileobj=compressed, mode='w|', format=tarfile.PAX_FORMAT) as archive:
                for name, entry in sorted(expected.items()):
                    source = Path(entry['source'])
                    details = source.lstat()
                    if not stat.S_ISREG(details.st_mode) or details.st_nlink != 1 or details.st_size != entry['bytes']:
                        raise ValueError('Source is not an unchanged regular file')
                    info = tarfile.TarInfo(name)
                    info.size, info.mode, info.mtime = entry['bytes'], 0o644, 0
                    with source.open('rb') as handle:
                        reader = HashReader(handle)
                        archive.addfile(info, reader)
                        if reader.digest.hexdigest() != entry['sha256'] or handle.read(1):
                            raise ValueError('Source changed while packing')
        writer.finish_part()
    finally:
        if writer.handle:
            writer.handle.close()
    return {'parts': writer.parts, 'archiveSha256': writer.digest.hexdigest(), 'archiveBytes': writer.total, 'expandedBytes': total}


class PartsReader:
    def __init__(self, paths):
        self.paths, self.current = iter(paths), None

    def read(self, size=-1):
        if size < 0:
            raise ValueError('Unbounded archive read refused')
        chunks, remaining = [], size
        while remaining:
            if self.current is None:
                try:
                    self.current = next(self.paths).open('rb')
                except StopIteration:
                    break
            chunk = self.current.read(remaining)
            if not chunk:
                self.current.close()
                self.current = None
                continue
            chunks.append(chunk)
            remaining -= len(chunk)
        return b''.join(chunks)

    def close(self):
        if self.current:
            self.current.close()


class BoundedReader:
    def __init__(self, handle, limit):
        self.handle, self.remaining = handle, limit

    def read(self, size=-1):
        if size < 0:
            raise ValueError('Unbounded expanded read refused')
        data = self.handle.read(min(size, self.remaining + 1))
        self.remaining -= len(data)
        if self.remaining < 0:
            raise ValueError('Archive expansion exceeds limit')
        return data


def verify_parts(manifest, source):
    result, overall, total = [], hashlib.sha256(), 0
    parts = manifest['parts']
    if not isinstance(parts, list) or not 1 <= len(parts) <= 1024:
        raise ValueError('Invalid part count')
    for i, part in enumerate(parts):
        if part.get('name') != 'catalogue.part-%05d' % i or type(part.get('bytes')) is not int or not 0 < part['bytes'] <= CHUNK_BYTES:
            raise ValueError('Invalid ordered part')
        file = source / part['name']
        details = file.lstat()
        if not stat.S_ISREG(details.st_mode) or details.st_nlink != 1 or details.st_size != part['bytes']:
            raise ValueError('Invalid part file')
        digest = hashlib.sha256()
        with file.open('rb') as handle:
            while chunk := handle.read(1024 * 1024):
                digest.update(chunk)
                overall.update(chunk)
                total += len(chunk)
        if digest.hexdigest() != part.get('sha256'):
            raise ValueError('Part digest mismatch')
        result.append(file)
    if total != manifest['archiveBytes'] or overall.hexdigest() != manifest['archiveSha256']:
        raise ValueError('Archive digest mismatch')
    return result


def unpack(manifest, source, output):
    expected, total = records(manifest['files'])
    if total != manifest['expandedBytes'] or output.exists() or output.is_symlink():
        raise ValueError('Invalid extraction target or expanded size')
    parts = verify_parts(manifest, source)
    if shutil.disk_usage(output.parent).free < total + 1024 * 1024 * 1024:
        raise ValueError('Insufficient extraction disk headroom')

    def scan(write):
        seen = set()
        joined = PartsReader(parts)
        try:
            with gzip.GzipFile(fileobj=joined, mode='rb') as compressed:
                bounded = BoundedReader(compressed, total + len(expected) * 4096 + 1024 * 1024)
                with tarfile.open(fileobj=bounded, mode='r|') as archive:
                    for member in archive:
                        name = safe_path(member.name)
                        entry = expected.get(name)
                        if not member.isfile() or member.sparse is not None or name in seen or entry is None or member.size != entry['bytes']:
                            raise ValueError('Archive member differs from reviewed inventory')
                        seen.add(name)
                        handle = archive.extractfile(member)
                        digest, read = hashlib.sha256(), 0
                        target = None
                        try:
                            if write:
                                destination = output.joinpath(*name.split('/'))
                                destination.parent.mkdir(parents=True, exist_ok=True)
                                target = destination.open('xb')
                            while chunk := handle.read(1024 * 1024):
                                read += len(chunk)
                                if read > entry['bytes']:
                                    raise ValueError('Expanded member exceeds size')
                                digest.update(chunk)
                                if target:
                                    target.write(chunk)
                        finally:
                            handle.close()
                            if target:
                                target.close()
                        if read != entry['bytes'] or digest.hexdigest() != entry['sha256']:
                            raise ValueError('Extracted file digest mismatch')
                    # Include tar's buffered read-ahead after its end marker.
                    while chunk := archive.fileobj.read(1024 * 1024):
                        if any(chunk):
                            raise ValueError('Unexpected archive trailer')
        finally:
            joined.close()
        if seen != set(expected):
            raise ValueError('Archive file set is incomplete')

    scan(False)  # Complete path/type/size/hash validation before any output write.
    output.mkdir()
    scan(True)
    return {'files': len(expected), 'bytes': total}


def main():
    mode, spec, source, output = sys.argv[1:]
    data = json.loads(Path(spec).read_text(encoding='utf-8'))
    result = pack(data, Path(output)) if mode == 'pack' else unpack(data, Path(source), Path(output)) if mode == 'unpack' else None
    if result is None:
        raise ValueError('Unknown archive operation')
    print(json.dumps(result))


if __name__ == '__main__':
    try:
        main()
    except Exception:
        print('Catalogue archive validation failed; no provider operation performed.', file=sys.stderr)
        sys.exit(1)
