export interface CustomerPreviewField {
  name: string;
  type?: string;
  default?: string;
}

export interface CustomerPreviewStylesheet {
  path: string;
  css: string;
}

interface TemplatePreviewComposition {
  html: string;
  css: string | null;
  variationCSS: string | null;
  page: string;
}

interface CustomerPreviewComposers {
  combineTemplateThemeStylesheets: (
    stylesheets: readonly { path: string; css: string | null | undefined }[],
  ) => string;
  composeTemplatePreview: (input: {
    html: string;
    css?: string | null;
    themeStylesheet?: string | null;
    page: string;
    fields: readonly CustomerPreviewField[];
    values?: Record<string, string>;
    colorScheme?: string;
    fontVariation?: string;
    structureVariation?: string;
    customTheme?: null;
  }) => TemplatePreviewComposition;
  composeCustomerPreviewDocument: (input: {
    html: string;
    css?: string | null;
    variationCSS?: string | null;
    assetBase: string;
    page: string;
    baseStylesheetPath?: string;
    trustedEditorScript?: string | null;
  }) => string;
  getCustomerPreviewEditorScript: (page: string) => string;
}

type DynamicImporter = (specifier: string) => Promise<unknown>;

const PREVIEW_COMPOSITION_MODULE = new URL(
  '../../../../apps/generator-app/src/lib/template-preview-composition.ts',
  import.meta.url,
).href;
const CUSTOMER_DOCUMENT_MODULE = new URL(
  '../../../../apps/generator-app/src/lib/customer-preview-document.ts',
  import.meta.url,
).href;
const CUSTOMER_EDITOR_RUNTIME_MODULE = new URL(
  '../../../../apps/generator-app/src/lib/customer-preview-editor-runtime.ts',
  import.meta.url,
).href;

let sharedComposers: Promise<CustomerPreviewComposers> | undefined;

function moduleRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object') throw new Error(`${label} did not export a module object`);
  return value as Record<string, unknown>;
}

/**
 * Load the app-owned pure composition functions from source. The compiler CLI
 * runs under tsx, so this deliberate repository-internal import exercises the
 * exact preview implementation without copying app behavior into the factory.
 */
export function loadCustomerPreviewComposers(options: {
  importer?: DynamicImporter;
  previewModule?: string;
  customerDocumentModule?: string;
  customerEditorRuntimeModule?: string;
} = {}): Promise<CustomerPreviewComposers> {
  const useDefaults = !options.importer
    && !options.previewModule
    && !options.customerDocumentModule
    && !options.customerEditorRuntimeModule;
  if (useDefaults && sharedComposers) return sharedComposers;
  const importer = options.importer ?? ((specifier: string) => import(specifier));
  const load = async (): Promise<CustomerPreviewComposers> => {
    const previewSpecifier = options.previewModule ?? PREVIEW_COMPOSITION_MODULE;
    const documentSpecifier = options.customerDocumentModule ?? CUSTOMER_DOCUMENT_MODULE;
    const editorRuntimeSpecifier = options.customerEditorRuntimeModule ?? CUSTOMER_EDITOR_RUNTIME_MODULE;
    try {
      const [previewValue, documentValue, editorRuntimeValue] = await Promise.all([
        importer(previewSpecifier),
        importer(documentSpecifier),
        importer(editorRuntimeSpecifier),
      ]);
      const preview = moduleRecord(previewValue, 'template-preview-composition');
      const document = moduleRecord(documentValue, 'customer-preview-document');
      const editorRuntime = moduleRecord(editorRuntimeValue, 'customer-preview-editor-runtime');
      if (
        typeof preview.composeTemplatePreview !== 'function'
        || typeof preview.combineTemplateThemeStylesheets !== 'function'
        || typeof document.composeCustomerPreviewDocument !== 'function'
        || typeof editorRuntime.getCustomerPreviewEditorScript !== 'function'
      ) {
        throw new Error('required composition exports are absent');
      }
      return {
        combineTemplateThemeStylesheets: preview.combineTemplateThemeStylesheets as CustomerPreviewComposers['combineTemplateThemeStylesheets'],
        composeTemplatePreview: preview.composeTemplatePreview as CustomerPreviewComposers['composeTemplatePreview'],
        composeCustomerPreviewDocument: document.composeCustomerPreviewDocument as CustomerPreviewComposers['composeCustomerPreviewDocument'],
        getCustomerPreviewEditorScript: editorRuntime.getCustomerPreviewEditorScript as CustomerPreviewComposers['getCustomerPreviewEditorScript'],
      };
    } catch (error) {
      throw new Error(
        'Customer preview composers could not be loaded; compiler browser QA cannot certify the customer route: '
        + (error instanceof Error ? error.message : String(error)),
      );
    }
  };
  const promise = load();
  if (useDefaults) sharedComposers = promise;
  return promise;
}

export async function composeCustomerPreviewWithApp(input: {
  html: string;
  page: string;
  fields: readonly CustomerPreviewField[];
  values: Record<string, string>;
  stylesheets: readonly CustomerPreviewStylesheet[];
  assetBase: string;
  composers?: CustomerPreviewComposers;
}): Promise<string> {
  const composers = input.composers ?? await loadCustomerPreviewComposers();
  const stylesheets = [...input.stylesheets].sort((left, right) => left.path.localeCompare(right.path, 'en'));
  const baseStylesheetPath = 'assets/css/styles.css';
  const baseCss = stylesheets.find((entry) => entry.path === baseStylesheetPath)?.css ?? null;
  const preview = composers.composeTemplatePreview({
    html: input.html,
    css: baseCss,
    themeStylesheet: composers.combineTemplateThemeStylesheets(stylesheets),
    page: input.page,
    fields: input.fields,
    values: input.values,
    colorScheme: 'original',
    fontVariation: 'original',
    structureVariation: 'original',
    customTheme: null,
  });
  if (
    !preview
    || typeof preview.html !== 'string'
    || preview.page !== input.page
    || (preview.css !== null && typeof preview.css !== 'string')
    || (preview.variationCSS !== null && typeof preview.variationCSS !== 'string')
  ) {
    throw new Error('The app preview API composer returned an invalid document contract');
  }
  const document = composers.composeCustomerPreviewDocument({
    html: preview.html,
    css: preview.css,
    variationCSS: preview.variationCSS,
    assetBase: input.assetBase,
    page: preview.page,
    baseStylesheetPath,
    trustedEditorScript: composers.getCustomerPreviewEditorScript(preview.page),
  });
  if (typeof document !== 'string' || !document.trim()) {
    throw new Error('The app customer srcDoc composer returned an empty document');
  }
  return document;
}
