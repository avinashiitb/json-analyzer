export const parseSafe = (text) => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
};

export const beautify = (text, sortKeys = false) => {
  const obj = parseSafe(text);
  if (!obj) return text; // Return original if not valid JSON

  if (sortKeys) {
    const deepSort = (o) => {
      if (Array.isArray(o)) {
        return o.map(deepSort);
      } else if (o !== null && typeof o === 'object') {
        return Object.keys(o)
          .sort()
          .reduce((acc, key) => {
            acc[key] = deepSort(o[key]);
            return acc;
          }, {});
      }
      return o;
    };
    return JSON.stringify(deepSort(obj), null, 2);
  }

  return JSON.stringify(obj, null, 2);
};

export const minify = (text) => {
  const obj = parseSafe(text);
  if (!obj) return text;
  return JSON.stringify(obj);
};
