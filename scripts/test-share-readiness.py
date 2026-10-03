"""Native Playwright release gate for optional replay, share cards and phone rotation."""
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
OUT = ROOT / '.cache/share-readiness'
OUT.mkdir(parents=True, exist_ok=True)
checks = []

def passed(label):
    checks.append(label)
    print('PASS:', label, flush=True)

def scan(page, label):
    page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
    violations = page.evaluate("""async () => (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))""")
    assert not violations, (label, violations)
    assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), label
    passed(label)

TEXT_AUDIT = """(() => {
 const original=CanvasRenderingContext2D.prototype.fillText;
 window.exportBounds=[];
 CanvasRenderingContext2D.prototype.fillText=function(text,x,y,maxWidth) {
  if((this.canvas.width===1080 && this.canvas.height===1920)||(this.canvas.width===1200 && this.canvas.height===630)) {
   const m=this.measureText(text);window.exportBounds.push({width:this.canvas.width,text,x,y,right:x+Math.min(m.width,maxWidth??Infinity),bottom:y+m.actualBoundingBoxDescent,font:this.font});
  }
  return original.call(this,text,x,y,...(maxWidth===undefined?[]:[maxWidth]));
 };
})()"""

def start(page, strings):
    page.get_by_role('button', name=strings['showcase'], exact=True).click()
    expect(page.get_by_role('dialog')).to_be_visible()
    page.locator('#showcase-level').fill('6')
    page.get_by_role('button', name=strings['showcaseStart'], exact=True).click()
    expect(page.get_by_test_id('showcase-panel')).to_be_visible(timeout=30000)

with sync_playwright() as p:
    launch = dict(headless=True, args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    if args.browser:
        launch['executable_path'] = args.browser
    browser = p.chromium.launch(**launch)
    for width in [1440, 390]:
        context = browser.new_context(viewport=dict(width=width,height=900 if width==1440 else 844), reduced_motion='reduce',accept_downloads=True)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.add_init_script(TEXT_AUDIT)
        for language in ['en', 'as']:
            page.goto(args.url.rstrip('/')+f'/?lang={language}&showcase=1')
            page.wait_for_load_state('networkidle')
            strings = page.evaluate(f"async () => (await import('/src/shared/i18n/atlas.ts')).ATLAS_COPY.{language}")
            expect(page.get_by_test_id('scenario-play')).to_be_enabled(timeout=60000)
            expect(page.get_by_test_id('app')).to_have_attribute('lang',language)
            assert page.locator('[data-showcase]').count()==0, 'Replay forced on initial visit'
            assert page.get_by_test_id('scenario-play').bounding_box()['y'] < (844 if width==390 else 900)
            page.screenshot(path=str(OUT/f'first-{width}-{language}.png'),full_page=True)
            scan(page,f'{width} {language} first view and optional entry')
            page.get_by_test_id('scenario-play').click()
            page.get_by_label(strings['compare'],exact=True).check()
            divider = page.get_by_role('slider',name=strings['dragDivider'],exact=True)
            divider.focus()
            dimensions = page.evaluate("""() => {const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom}};return {line:box('.comparison-line'),intro:box('.atlas-intro'),navigation:box('.map-navigation'),outline:getComputedStyle(document.querySelector('.comparison-map-slider')).outlineStyle}}""")
            assert dimensions['line']['top'] >= dimensions['intro']['bottom'], dimensions
            assert dimensions['line']['bottom'] <= dimensions['navigation']['top'], dimensions
            assert dimensions['outline']=='none', dimensions
            page.screenshot(path=str(OUT/f'comparison-{width}-{language}.png'),full_page=True)
            scan(page,f'{width} {language} divider clear of intro and navigation')
            # Reduced motion uses deliberate steps, keeping the water illustration paused.
            start(page,strings)
            expect(page.get_by_role('button',name=strings['showcaseNext'],exact=True)).to_be_focused()
            for stage in ['river','water','compare','transition','history','finish']:
                page.get_by_role('button',name=strings['showcaseNext'],exact=True).click()
                expect(page.get_by_test_id('app')).to_have_attribute('data-showcase',stage,timeout=60000)
                button = page.get_by_role('button',name=strings['showcaseExplore'] if stage=='finish' else strings['showcaseNext'],exact=True)
                expect(button).to_be_enabled(timeout=60000)
                if stage in ['water','compare','finish']:
                    page.screenshot(path=str(OUT/f'showcase-{stage}-{width}-{language}.png'),full_page=True)
                if stage=='compare':
                    assert page.get_by_role('slider',name=strings['dragDivider'],exact=True).input_value()=='50'
            scan(page,f'{width} {language} reduced-motion showcase and completion')
            page.get_by_role('button',name=strings['showcaseExplore'],exact=True).click()
            expect(page.get_by_role('dialog')).to_be_visible()
            page.get_by_role('button',name=strings['close'],exact=True).click()
            expect(page.get_by_role('button',name=strings['showcase'],exact=True)).to_be_focused()
            page.get_by_test_id('mode-flow').click()
            # Both export formats, in both languages and modes, with measured text bounds.
            for mode in ['flow','fault']:
                if mode=='fault': page.get_by_test_id('mode-fault').click()
                expect(page.get_by_role('button',name=strings['share'],exact=True)).to_be_enabled(timeout=60000)
                page.evaluate('window.exportBounds=[]')
                page.get_by_role('button',name=strings['share'],exact=True).click()
                for format,size in [('portrait',(1080,1920)),('landscape',(1200,630))]:
                    if format=='landscape': page.evaluate('window.exportBounds=[]')
                    page.locator('#share-format').select_option(format)
                    save=page.get_by_role('button',name=strings['saveStory'] if format=='portrait' else strings['saveSocial'],exact=True)
                    expect(save).to_be_enabled(timeout=60000)
                    data=page.locator('.share-preview img').get_attribute('src')
                    image=Image.open(io.BytesIO(base64.b64decode(data.split(',')[1])))
                    assert image.size==size,(format,image.size)
                    bounds=page.evaluate('window.exportBounds')
                    assert bounds, 'No export text was measured'
                    assert all(b['right']<=size[0]-24 and b['bottom']<size[1]-16 for b in bounds),bounds
                    if format=='landscape': assert any('madb0i.github.io' in b['text'] for b in bounds),bounds
                    image.save(OUT/f'{mode}-{format}-{width}-{language}.png')
                    with page.expect_download() as download: save.click()
                    assert download.value.suggested_filename.endswith('.png')
                scan(page,f'{width} {language} {mode} portrait/landscape export and text bounds')
                page.get_by_role('button',name=strings['close'],exact=True).click()
        if width==390:
            page.set_viewport_size(dict(width=844,height=390))
            page.screenshot(path=str(OUT/'rotated-phone.png'),full_page=True)
            assert page.evaluate("getComputedStyle(document.querySelector('.atlas-app')).overflowY")=='visible'
            boxes=page.evaluate("""() => {const r=s=>{const b=document.querySelector(s).getBoundingClientRect();return {top:b.top,bottom:b.bottom}};return {intro:r('.atlas-intro'),nav:r('.map-navigation')}}""")
            assert boxes['intro']['bottom']<=boxes['nav']['top'],boxes
            scan(page,'Rotated phone remains scrollable with reachable controls')
            page.get_by_test_id('mode-flow').click()
            page.get_by_test_id('scenario-play').scroll_into_view_if_needed()
            page.get_by_test_id('scenario-play').click()
            page.get_by_role('button',name=strings['share'],exact=True).click()
            expect(page.locator('.share-preview img')).to_be_visible(timeout=60000)
            scan(page,'Rotated phone run and share sheet')
        assert not errors,errors
        context.close()
    # A reduced-motion cold start from a regional scene keeps an enabled exit focused.
    context=browser.new_context(viewport=dict(width=390,height=844),reduced_motion='reduce')
    page=context.new_page()
    page.goto(args.url.rstrip('/')+'/?area=majuli')
    expect(page.get_by_test_id('scenario-play')).to_be_enabled(timeout=60000)
    strings=page.evaluate("async () => (await import('/src/shared/i18n/atlas.ts')).ATLAS_COPY.en")
    def delayed_overview(route):
        page.wait_for_timeout(1000)  # Controlled slow-terrain loading for the focus assertion.
        route.continue_()
    page.route('**/*assam-overview.png*',delayed_overview)
    start(page,strings)
    expect(page.get_by_role('button',name=strings['showcaseSkip'],exact=True)).to_be_focused()
    expect(page.get_by_role('button',name=strings['showcaseNext'],exact=True)).to_be_enabled(timeout=60000)
    page.keyboard.press('Escape')
    expect(page.get_by_role('button',name=strings['showcase'],exact=True)).to_be_focused(timeout=60000)
    passed('Cold reduced-motion start keeps a keyboard exit usable while loading')
    context.close()
    # A real timed replay, pause/skip, reload and failed terrain recovery.
    context=browser.new_context(viewport=dict(width=1440,height=900),reduced_motion='no-preference')
    page=context.new_page()
    page.goto(args.url.rstrip('/')+'/')
    expect(page.get_by_test_id('scenario-play')).to_be_enabled(timeout=60000)
    strings=page.evaluate("async () => (await import('/src/shared/i18n/atlas.ts')).ATLAS_COPY.en")
    start(page,strings)
    expect(page.get_by_role('button',name=strings['showcasePause'],exact=True)).to_be_focused()
    page.get_by_role('button',name=strings['showcasePause'],exact=True).click()
    phase=page.get_by_test_id('app').get_attribute('data-showcase')
    page.wait_for_timeout(700)  # Assert that a pause remains stable for a known interval.
    expect(page.get_by_test_id('app')).to_have_attribute('data-showcase',phase)
    page.get_by_role('button',name=strings['showcaseResume'],exact=True).click()
    expect(page.get_by_test_id('app')).to_have_attribute('data-showcase','water',timeout=60000)
    expect(page.get_by_text(strings['showcaseLoading'],exact=True)).not_to_be_visible(timeout=60000)
    page.screenshot(path=str(OUT/'timed-water.png'),full_page=True)
    expect(page.get_by_test_id('app')).to_have_attribute('data-showcase','compare',timeout=60000)
    page.screenshot(path=str(OUT/'timed-compare.png'),full_page=True)
    expect(page.get_by_test_id('app')).to_have_attribute('data-showcase','history',timeout=60000)
    page.screenshot(path=str(OUT/'timed-history.png'),full_page=True)
    expect(page.get_by_test_id('app')).to_have_attribute('data-showcase','finish',timeout=60000)
    scan(page,'Timed recorded-history replay, pause and finish')
    page.get_by_role('button',name=strings['showcaseReplay'],exact=True).click()
    expect(page.get_by_test_id('app')).to_have_attribute('data-showcase','overview',timeout=60000)
    page.get_by_role('button',name=strings['showcaseSkip'],exact=True).click()
    expect(page.get_by_role('button',name=strings['showcase'],exact=True)).to_be_focused()
    expect(page.get_by_test_id('app')).to_have_attribute('data-mode','flow')
    passed('Replay preserves the original exit destination and keyboard focus')
    page.reload(); expect(page.get_by_test_id('scenario-play')).to_be_enabled(timeout=60000)
    assert page.locator('[data-showcase]').count()==0
    passed('Skip restores exploration and returning visits never auto-play')
    start(page,strings)
    page.evaluate("history.pushState(null,'','/?mode=fault')")
    page.go_back()
    expect(page.get_by_test_id('showcase-panel')).not_to_be_visible(timeout=60000)
    expect(page.get_by_test_id('scenario-play')).to_be_enabled(timeout=60000)
    passed('Browser-history navigation exits the replay and restores the linked view')
    page.route('**/majuli*.png',lambda route:route.abort())
    start(page,strings)
    expect(page.get_by_text(strings['showcaseFailed'],exact=True)).to_be_visible(timeout=60000)
    page.get_by_role('button',name=strings['showcaseSkip'],exact=True).click()
    expect(page.get_by_test_id('scenario-play')).to_be_enabled(timeout=60000)
    passed('Failed showcase terrain offers a usable exit and restores the atlas')
    context.close(); browser.close()
(OUT/'checks.json').write_text(json.dumps(checks,indent=2))
print(f'{len(checks)} share-readiness checks passed',flush=True)
