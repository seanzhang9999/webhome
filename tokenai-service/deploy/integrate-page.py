"""Add the live expense pack without changing the coffee simulation data."""
from pathlib import Path

page = Path(__file__).resolve().parents[2] / 'awiki-coffee-trusted-space-v55-cfo.html'
text = page.read_text()
if 'tokenai-expense-integration: 1' in text:
    raise SystemExit('Integration already applied; inspect before modifying')

def replace(old, new):
    global text
    if text.count(old) != 1:
        raise SystemExit(f'Expected exactly one integration point: {old[:100]}')
    text = text.replace(old, new, 1)

replace('<body><div id="root"></div><script>', '<body><div id="root"></div><link rel="stylesheet" href="./tokenai-markdown.css?v=4"><script src="./tokenai-markdown.js?v=1"></script><script src="./tokenai-expense.js?v=9"></script><script>/* tokenai-expense-integration: 1 */')
replace("let view='work',workTab='matters'", "let selectedPack='coffee',expenseSelected=false;\nlet view='work',workTab='matters'")
replace("if(workTab==='matters')return s.created.filter(id=>allowedGroup(id)).map(id=>({key:'group:'+id,title:GROUPS[id].name,sub:GROUPS[id].short,mark:GROUPS[id].tag[0],state:id===active().g?'当前事项':'已接续'}));", "if(workTab==='matters')return [{key:'matter:expense',title:'报销费控工作台',sub:'财务人员 · TokenAI / Pi Agent',mark:'费',state:'固定事项'},...s.created.filter(id=>allowedGroup(id)).map(id=>({key:'group:'+id,title:GROUPS[id].name,sub:GROUPS[id].short,mark:GROUPS[id].tag[0],state:id===active().g?'当前事项':'已接续'}))];")
replace("return [{key:'pack:main',title:PACK.name,sub:PACK.id+'@'+PACK.version,mark:'方'}];", "return [{key:'pack:main',title:PACK.name,sub:PACK.id+'@'+PACK.version,mark:'方'},{key:'pack:expense-control',title:'报销费控协同方案',sub:'固定财务事项 · TokenAI / Pi Agent',mark:'费'}];")
replace("workTab==='matters'?'group:'+s.selected", "workTab==='matters'?(expenseSelected?'matter:expense':'group:'+s.selected)")
replace("'space:overview':'pack:main')", "'space:overview':selectedPack==='expense-control'?'pack:expense-control':'pack:main')")
replace("function top(){return", "function top(){if(view==='work'&&(expenseSelected&&workTab==='matters'||selectedPack==='expense-control'&&workTab==='solutions'))return `<header class=\"topbar\"><div class=\"topstart\"><div><b>AWiki · 报销费控协同</b><small>固定事项 · 财务人员与 TokenAI 协作</small></div>${pill('真实服务接入','ok')}</div><div class=\"topactions\">${btn('报销费控方案','expense:pack','tiny')}${btn('进入固定事项','expense:matter','primary')}</div></header>`;return")
replace("let center;if(view==='work')center=workTab==='matters'?conversation()", "let center;if(view==='work')center=workTab==='matters'?(expenseSelected?window.TokenAIExpense.html():conversation())")
replace("topicPage(topic)):packPage();else center=auxiliary();", "topicPage(topic)):(selectedPack==='expense-control'?window.TokenAIExpense.packHtml():packPage());else center=auxiliary();")
replace('${list()}${center}${partner()}', "${list()}${center}${view==='work'&&(expenseSelected&&workTab==='matters'||selectedPack==='expense-control'&&workTab==='solutions')?window.TokenAIExpense.partnerHtml():partner()}")
replace("<span>${esc(active().id)} · ${esc(active().time)} · ${storeFailed?'浏览器存储不可用':'本地状态可刷新恢复'} · 全部为虚构模拟</span><span>未接入真实ANP/DID、CFO账务、银行、海关、货代或外部AI</span>", "${view==='work'&&(expenseSelected&&workTab==='matters'||selectedPack==='expense-control'&&workTab==='solutions')?'<span>报销费控 · 真实消息保存在 TokenAI 服务端</span><span>审核结果依据 TokenX 实际返回；付款和到账另行核查</span>':`<span>${esc(active().id)} · ${esc(active().time)} · ${storeFailed?'浏览器存储不可用':'本地状态可刷新恢复'} · 全部为虚构模拟</span><span>未接入真实ANP/DID、CFO账务、银行、海关、货代或外部AI</span>`}")
replace("function selectObject(key){if(key.startsWith('group:'))", "function selectObject(key){if(key==='matter:expense'){stop();expenseSelected=true;view='work';workTab='matters';search='';render();return;}if(key.startsWith('group:'))")
replace("view='work';workTab='matters';s.selected=id;persist();", "expenseSelected=false;view='work';workTab='matters';s.selected=id;persist();")
replace("if(key.startsWith('pack:')){view='work';workTab='solutions';render();return;}", "if(key.startsWith('pack:')){selectedPack=key==='pack:expense-control'?'expense-control':'coffee';view='work';workTab='solutions';render();return;}")
replace("function action(a){if(!a)return;", "function action(a){if(!a)return;\n if(a==='expense:pack'){selectObject('pack:expense-control');return;}if(a==='expense:matter'){selectObject('matter:expense');return;}")
replace("if(view==='work')workTab='matters';search='';render();return;", "if(view==='work'){workTab='matters';expenseSelected=false;}search='';render();return;")
replace("view='work';workTab='matters';s.selected=active().g;persist();", "expenseSelected=false;view='work';workTab='matters';s.selected=active().g;persist();")
replace(" const chat=q('#chat-scroll');", " if(view==='work'&&workTab==='matters'&&expenseSelected)window.TokenAIExpense.mount();\n const chat=q('#chat-scroll');")
page.write_text(text)
print('Integrated expense pack and fixed matter')
