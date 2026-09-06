const identifier = /^[a-zA-Z0-9_-]+$/;
const safeColor = /^(?:#[a-fA-F0-9]{3,8}|(?:hsl|hsla|rgb|rgba)\([0-9.,%\s+-]+\)|hsl\(var\(--chart-[1-8]\)\)|[a-zA-Z]+)$/;

export function chartStyles(id: string, config: Record<string, { color?: string; theme?: { light: string; dark: string } }>): string {
  if (!identifier.test(id)) return "";
  return ([['light', ''], ['dark', '.dark']] as const).map(([theme, prefix]) => {
    const declarations = Object.entries(config).flatMap(([key, value]) => {
      const color = value.theme?.[theme] || value.color;
      return identifier.test(key) && color && safeColor.test(color) ? [`  --color-${key}: ${color};`] : [];
    });
    return `${prefix} [data-chart="${id}"] {\n${declarations.join('\n')}\n}`;
  }).join('\n');
}
