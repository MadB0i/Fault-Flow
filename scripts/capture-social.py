"""Real engine captures and native brand assets for the static social preview."""
import argparse
import base64
import io
import json
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:5173')
parser.add_argument('--browser')
args = parser.parse_args()
OUT = ROOT / '.cache/social'
OUT.mkdir(parents=True, exist_ok=True)
PUBLIC = ROOT / 'public'
PUBLIC.mkdir(exist_ok=True)

def source(page, name):
    page.get_by_role('button', name='Share this view', exact=True).click()
    expect(page.get_by_role('button', name='Save portrait story', exact=True)).to_be_enabled(timeout=60000)
    with page.expect_download() as result:
        page.get_by_role('button', name='Save map image', exact=True).click()
    path = OUT / f'{name}-source.png'
    result.value.save_as(path)
    image = Image.open(path)
    image = image.crop((0, 0, image.width, image.height - 260))
    data = io.BytesIO()
    image.save(data, format='PNG')
    page.get_by_role('button', name='Close', exact=True).click()
    return 'data:image/png;base64,' + base64.b64encode(data.getvalue()).decode()

with sync_playwright() as p:
    launch = dict(headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    if args.browser:
        launch['executable_path'] = args.browser
    browser = p.chromium.launch(**launch)
    page = browser.new_page(viewport=dict(width=1440, height=900), reduced_motion='reduce', accept_downloads=True)
    page.goto(args.url.rstrip('/') + '/?area=majuli&level=6')
    page.wait_for_load_state('networkidle')
    expect(page.get_by_test_id('scenario-play')).to_be_enabled(timeout=60000)
    # Render the original SVG through the browser, with no font/image service.
    for size, name in [(32, 'favicon-32.png'), (180, 'apple-touch-icon.png'), (192, 'app-icon-192.png'), (512, 'app-icon-512.png')]:
        icon = page.evaluate('''async ({size,url}) => { const image=new Image();image.src=url;await image.decode(); const c=document.createElement('canvas'); c.width=c.height=size; c.getContext('2d').drawImage(image,0,0,size,size); return c.toDataURL('image/png'); }''', dict(size=size, url=args.url.rstrip('/') + '/favicon.svg'))
        destination = PUBLIC / name
        pixels = base64.b64decode(icon.split(',')[1])
        if not destination.exists() or destination.read_bytes() != pixels:
            destination.write_bytes(pixels)
    page.get_by_test_id('scenario-play').click()
    page.wait_for_timeout(1800)  # Known animated scenario interval for this illustrative capture.
    page.get_by_test_id('scenario-play').click()
    flow = source(page, 'flow')
    page.get_by_test_id('mode-fault').click()
    page.get_by_role('button', name='Explore more', exact=True).click()
    page.get_by_role('button', name='Explore the 1950 earthquake', exact=True).click()
    expect(page.locator('#quake-year')).to_have_value('1950')
    page.get_by_role('button', name='Collapse', exact=True).click()
    expect(page.get_by_role('button', name='Share this view', exact=True)).to_be_enabled(timeout=60000)
    fault = source(page, 'fault')
    attribution = json.loads((ROOT / 'data/processed/majuli.json').read_text())['attribution']
    data = page.evaluate('''async ({flow,fault,attribution}) => {
      await document.fonts.ready;
      const style=getComputedStyle(document.documentElement), token=n=>style.getPropertyValue(n).trim();
      const c=document.createElement('canvas');c.width=1200;c.height=630;const ctx=c.getContext('2d');
      const write=(text,x,y,size,color,width=1136,display=false)=>{ctx.font=`${size}px ${token(display?'--font-display':'--font-ui')}`;ctx.fillStyle=color;let line='';for(const word of text.split(/\\s+/)){const next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>width){ctx.fillText(line,x,y);y+=size*1.4;line=word;}else line=next;}ctx.fillText(line,x,y);return y+size*1.4;};
      ctx.fillStyle=token('--bg');ctx.fillRect(0,0,1200,630);
      write('Fault & Flow',32,68,44,token('--text'),760,true);
      write('An interactive 3D atlas of Assam',32,102,22,token('--text-muted'));
      write('madb0i.github.io/Fault-and-Flow/',800,66,16,token('--water'),368);
      write('BRAHMAPUTRA · CHOSEN 6 m SCENARIO',32,136,15,token('--water'));
      write('RECORDED EARTHQUAKES · THROUGH 1950',736,136,15,token('--seismic-amber'),432);
      for(const [url,x,width] of [[flow,32,688],[fault,736,432]]) {const image=new Image();image.src=url;await image.decode();ctx.fillStyle=token('--sky-low');ctx.fillRect(x,152,width,296);const scale=(url===fault?Math.max:Math.min)(width/image.width,296/image.height);ctx.save();ctx.beginPath();ctx.rect(x,152,width,296);ctx.clip();ctx.drawImage(image,x+(width-image.width*scale)/2,152+(296-image.height*scale)/2,image.width*scale,image.height*scale);ctx.restore();}
      write('Flood scenarios. Recorded earthquakes. Your district.',32,486,27,token('--text'),1136,true);
      write('Educational sandbox · Not a forecast or hazard map · Earthquakes cannot be predicted',32,515,16,token('--water'));
      write(attribution+' Natural Earth geography. Earthquake catalog data courtesy of the U.S. Geological Survey. © OpenStreetMap contributors · ODbL · openstreetmap.org/copyright',32,544,12,token('--text-muted'));
      return c.toDataURL('image/png');
    }''', dict(flow=flow, fault=fault, attribution=attribution))
    path = PUBLIC / 'social-preview.png'
    path.write_bytes(base64.b64decode(data.split(',')[1]))
    assert Image.open(path).size == (1200, 630)
    assert path.stat().st_size < 5 * 1024 * 1024
    print(f'Real terrain/water and recorded earthquake preview: {path.stat().st_size:,} bytes', flush=True)
    browser.close()
