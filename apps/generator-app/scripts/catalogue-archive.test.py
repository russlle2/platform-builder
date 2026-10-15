import copy
import gzip
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('catalogue_archive', Path(__file__).with_name('catalogue-archive.py'))
archive = importlib.util.module_from_spec(spec)
spec.loader.exec_module(archive)


class ArchiveTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.source = self.root / 'input'
        self.source.mkdir()
        self.files = []
        for name, content in [('library/aromatherapy/example/index.html', b'<h1>Reviewed</h1>'), ('library/aromatherapy/example/.dailyclarity/final-quality-receipt.json', b'{"passed":true}'), ('promotion-dry-run.json', b'{}'), ('certification.json', b'{}'), ('library/empty.txt', b'')]:
            target = self.source / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
            self.files.append({'path': name, 'source': str(target), 'bytes': len(content), 'sha256': hashlib.sha256(content).hexdigest()})

    def tearDown(self):
        self.temporary.cleanup()

    def transport(self):
        parts = self.root / 'parts'
        result = archive.pack({'files': self.files}, parts, chunk_bytes=80)
        manifest = {**result, 'files': [{k: v for k, v in f.items() if k != 'source'} for f in self.files]}
        return parts, manifest

    def custom(self, entries, trailer=b''):
        raw = io.BytesIO()
        with tarfile.open(fileobj=raw, mode='w') as tar:
            for name, content, kind in entries:
                info = tarfile.TarInfo(name)
                if kind == 'link':
                    info.type, info.linkname = tarfile.SYMTYPE, '../../outside'
                    tar.addfile(info)
                else:
                    info.size = len(content)
                    tar.addfile(info, io.BytesIO(content))
        compressed = gzip.compress(raw.getvalue() + trailer, mtime=0)
        parts = self.root / 'parts'
        parts.mkdir()
        name = 'catalogue.part-00000'
        (parts / name).write_bytes(compressed)
        manifest = {'files': [{k: v for k, v in f.items() if k != 'source'} for f in self.files], 'parts': [{'name': name, 'bytes': len(compressed), 'sha256': hashlib.sha256(compressed).hexdigest()}], 'archiveBytes': len(compressed), 'archiveSha256': hashlib.sha256(compressed).hexdigest(), 'expandedBytes': sum(f['bytes'] for f in self.files)}
        return parts, manifest

    def entries(self):
        return [(f['path'], Path(f['source']).read_bytes(), 'file') for f in self.files]

    def refuses(self, parts, manifest):
        output = self.root / 'output'
        with self.assertRaises((ValueError, tarfile.TarError, OSError, EOFError)):
            archive.unpack(manifest, parts, output)
        self.assertFalse(output.exists(), 'Invalid archive must not write any extracted files')

    def test_roundtrip_preserves_all_bytes_and_hidden_proofs_across_parts(self):
        parts, manifest = self.transport()
        self.assertGreater(len(manifest['parts']), 1)
        output = self.root / 'output'
        result = archive.unpack(manifest, parts, output)
        self.assertEqual(result['files'], len(self.files))
        for file in self.files:
            self.assertEqual((output / file['path']).read_bytes(), Path(file['source']).read_bytes())

    def test_changed_source_is_refused(self):
        Path(self.files[0]['source']).write_bytes(b'x' * self.files[0]['bytes'])
        with self.assertRaises(ValueError):
            archive.pack({'files': self.files}, self.root / 'parts')

    def test_source_symlink_is_refused(self):
        target = Path(self.files[0]['source'])
        target.unlink()
        target.symlink_to(Path(self.files[1]['source']))
        with self.assertRaises(ValueError):
            archive.pack({'files': self.files}, self.root / 'parts')

    def test_corrupt_part_fails_before_extraction(self):
        parts, manifest = self.transport()
        target = parts / manifest['parts'][0]['name']
        target.write_bytes(b'x' * target.stat().st_size)
        self.refuses(parts, manifest)

    def test_path_traversal_member_is_refused(self):
        self.refuses(*self.custom(self.entries() + [('../outside', b'bad', 'file')]))
        self.assertFalse((self.root / 'outside').exists())

    def test_tar_link_and_duplicate_member_are_refused(self):
        self.refuses(*self.custom([(self.files[0]['path'], b'', 'link')] + self.entries()[1:]))

    def test_duplicate_member_is_refused(self):
        self.refuses(*self.custom(self.entries() + [self.entries()[0]]))

    def test_member_size_or_hash_change_is_refused(self):
        entries = self.entries()
        entries[0] = (entries[0][0], b'x' * len(entries[0][1]), 'file')
        self.refuses(*self.custom(entries))

    def test_missing_member_is_refused(self):
        self.refuses(*self.custom(self.entries()[1:]))

    def test_unlisted_member_is_refused(self):
        self.refuses(*self.custom(self.entries() + [('private-state.json', b'private', 'file')]))

    def test_nonzero_trailer_and_expansion_bomb_are_refused(self):
        self.refuses(*self.custom(self.entries(), b'not another archive'))

    def test_expansion_bomb_is_refused(self):
        self.refuses(*self.custom(self.entries(), b'\0' * (2 * 1024 * 1024)))

    def test_case_collision_and_file_directory_collision_are_refused(self):
        for extra in [{'path': self.files[0]['path'].upper(), 'bytes': 0, 'sha256': hashlib.sha256(b'').hexdigest()}, {'path': 'library', 'bytes': 0, 'sha256': hashlib.sha256(b'').hexdigest()}]:
            with self.assertRaises(ValueError):
                archive.records(self.files + [extra])

    def test_ordered_parts_and_existing_output_are_refused(self):
        parts, manifest = self.transport()
        altered = copy.deepcopy(manifest)
        altered['parts'].reverse()
        self.refuses(parts, altered)
        output = self.root / 'output'
        output.mkdir()
        sentinel = output / 'retained.txt'
        sentinel.write_text('keep')
        with self.assertRaises(ValueError):
            archive.unpack(manifest, parts, output)
        self.assertEqual(sentinel.read_text(), 'keep')


if __name__ == '__main__':
    unittest.main()
