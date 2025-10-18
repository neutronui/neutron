from coloraide import Color as Base
from coloraide.spaces.hct import HCT
from coloraide.contrast.lstar import LstarContrast
from string import Template
from colorama import Style, init
import os
import json

class Color(Base):
  ...

Color.register(HCT())
Color.register(LstarContrast())
init()

def hex_to_ansi(hex_code):
  hex_code = hex_code.lstrip('#')
  r, g, b = tuple(int(hex_code[i:i + 2], 16) for i in (0, 2, 4))
  return f"\033[38;2;{r};{g};{b}m"

with open(os.path.relpath('build/theme_templ.css')) as css_file:
  src = css_file.read()
css_templ = Template(src)

def tonal_palette(c, t):
  c = Color(c).convert('hct')
  return [c.clone().set('t', tone).fit('display-p3', method='raytrace', pspace='hct') for tone in t]

def convert_to_css_custom_properties(name, tones, colors):
  out = list()
  for tone, color in zip(tones, colors):
    out.append(f"\t--{name}-{tone:02d}: {color};\n")
  return out

def save_css_file(file_path, css_data):
  context = {
    'p3': css_data['p3'].rstrip(),
    'srgb': css_data['srgb'].rstrip()
  }
  with open(file_path, 'w') as f:
    f.write(css_templ.substitute(
      p3=context['p3'],
      srgb=context['srgb']
    ))

# Program
def main(config_path):
    with open(config_path, 'r') as config_file:
      config = json.load(config_file)
      out_dir = config['outDir']
      themes = config['themes']

      for theme in themes:
        name = theme['name']
        description = theme['description']
        tones = theme['tones']
        scales = theme['scales']
        semanticColors = theme['semanticColors']
        default = theme.get('default', False)

        with open(os.path.relpath('build/theme_templ.css')) as file:
          src = file.read()
        theme_templ = Template(src)

        theme_data = {}

        for key, value in scales.items():
          base_color = Color(value).convert('hct')
          scale = Color.steps([x for x in tonal_palette(base_color, tones)], steps=len(tones))
          key_tone = tones[scale.index(base_color.closest(scale))]

          print(f"Generating scale for {hex_to_ansi(value) + Style.BRIGHT}{name}-{key}{Style.RESET_ALL}...")

          p3_colors = [c.convert('display-p3').to_string() for c in scale]
          srgb_colors = [c.convert('oklch').to_string() for c in scale]

          p3_properties = convert_to_css_custom_properties(f'{key}', tones, p3_colors)
          srgb_properties = convert_to_css_custom_properties(f'{key}', tones, srgb_colors)

          theme_data[key] = {
            'srgb': list(),
            'p3': list()
          }

          theme_data[key]['srgb'].extend(srgb_properties)
          theme_data[key]['srgb'].append(f"\t--{key}: var(--{key}-{key_tone});\n")
          theme_data[key]['srgb'].append(f"\t--{key}-key: {key_tone};\n")

          theme_data[key]['p3'].extend(p3_properties)
          theme_data[key]['p3'].append(f"\t--{key}: var(--{key}-{key_tone});\n")
          theme_data[key]['p3'].append(f"\t--{key}-key: {key_tone};\n")

        theme_out_path = os.path.join(out_dir, f"{name}.css")
        with open(theme_out_path, 'w') as file:
          color_scales = {
            'srgb': '',
            'p3': ''
          }

          for key, value in theme_data.items():
            color_scales['srgb'] += ''.join(value['srgb']) + '\n'
            color_scales['p3'] += ''.join(value['p3']) + '\n'

          file.write(theme_templ.substitute(
            selector=f'.palette-{name}' if not default else ':where(:root), .palette-default',
            theme=name,
            description=description,
            srgb=color_scales['srgb'].rstrip(),
            p3=color_scales['p3'].rstrip()
          ))


        with open(os.path.relpath('build/semantic_templ.css')) as file:
          src = file.read()
        semantic_templ = Template(src)

        for semantic_name, palette_name in semanticColors.items():
          # Create the semantic color directory if it doesn't exist
          semantic_dir = os.path.join(out_dir, semantic_name)
          os.makedirs(semantic_dir, exist_ok=True)
          
          # Generate tone mappings dynamically based on config tones
          tone_mappings = []
          for tone in tones:
            tone_mappings.append(f"\t--color-{semantic_name}-{tone:02d}: var(--{palette_name}-{tone:02d});")
          
          # Generate the semantic color CSS file
          semantic_out_path = os.path.join(semantic_dir, f"{palette_name}.css")
          with open(semantic_out_path, 'w') as file:
            file.write(semantic_templ.substitute(
              semantic=semantic_name,
              palette=palette_name,
              tone_mappings='\n'.join(tone_mappings)
            ))
          
          print(f"Generated semantic color file: {semantic_out_path}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Generate CSS custom property color scales.")
    parser.add_argument("config_path", help="Path to the configuration file.")

    args = parser.parse_args()
    main(args.config_path)