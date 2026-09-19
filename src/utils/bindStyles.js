/** Keep stable DOM hooks while feature declarations use collision-free module classes.
 * Unknown tokens belong to the shared foundation (for example pagination).
 */
export function bindStyles(...sheets) {
  return (value = "") => {
    const tokens = value.trim().split(/\s+/).filter(Boolean);
    const scoped = tokens.flatMap((token) => sheets.map((sheet) => sheet[token]).filter(Boolean));
    return [...new Set([...tokens, ...scoped])].join(" ");
  };
}
