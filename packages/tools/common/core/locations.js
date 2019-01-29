export const EntryPart = /([^/]*(?:[#?].*)?$)/;
export const DirectoryPart = /(^[^#?]*\/)/;
export const PathnameParts = /^([^#?]*\/)([^/]*)$/;
export const SchemePart = /(^[a-z]+:(?=[/]{2}))/i;
export const QueryPart = /\?[^#]*/;
export const FragmentPart = /#.*$/;
export const StandardSchemes = ['file', 'https', 'http'];
