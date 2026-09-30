// "Ground Floor" -> "G", "8th Floor" -> "8"; anything else keeps its label.
export const shortFloorLabel = (label: string): string => {
  if (/ground/i.test(label)) return 'G';
  const n = label.match(/\d+/);
  return n ? n[0] : label;
};
