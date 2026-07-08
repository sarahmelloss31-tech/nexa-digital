require('dotenv').config();
const express=require('express'),cors=require('cors'),helmet=require('helmet'),cookieParser=require('cookie-parser'),bcrypt=require('bcryptjs'),crypto=require('crypto');
const app=express(),PORT=process.env.PORT||3000,OPENAI_API_KEY=process.env.OPENAI_API_KEY||'',OPENAI_MODEL=process.env.OPENAI_MODEL||'gpt-4o-mini',ALLOWED_ORIGIN=process.env.ALLOWED_ORIGIN||'*',APP_BASE_URL=process.env.APP_BASE_URL||'',NG_CASH_PAYMENT_LINK=process.env.NG_CASH_PAYMENT_LINK||'',NG_CASH_PIX_KEY=process.env.NG_CASH_PIX_KEY||'',NG_CASH_CONTACT=process.env.NG_CASH_CONTACT||'';
app.use(helmet({contentSecurityPolicy:false}));app.use(cors({origin:ALLOWED_ORIGIN==='*'?true:ALLOWED_ORIGIN,credentials:true}));app.use(express.json({limit:'1mb'}));app.use(cookieParser());app.use(express.static('public'));
const users=new Map(),sessions=new Map(),history=new Map();
const PLANS={free:{name:'Grátis',price:'R$ 0',credits:10,label:'Teste rápido'},pro:{name:'Pro',price:'R$ 19,90/mês',credits:300,label:'Adultos e criadores'},premium:{name:'Premium',price:'R$ 49,90/mês',credits:1200,label:'Empresas e famílias'}};
const safeUser=u=>({email:u.email,name:u.name,plan:u.plan,credits:u.credits});
function getUser(req){const t=req.cookies.session;if(!t)return null;const email=sessions.get(t);return email?users.get(email):null}
function auth(req,res,next){const u=getUser(req);if(!u)return res.status(401).json({error:'Faça login para continuar.'});req.user=u;next()}
function setSession(res,email){const t=crypto.randomBytes(32).toString('hex');sessions.set(t,email);res.cookie('session',t,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:2592000000})}
function audience(a){return({adultos:'adultos: linguagem clara, prática e orientada a decisão.',criancas:'crianças: linguagem lúdica, educativa, segura, sem dados pessoais, sem conteúdo impróprio e com supervisão adulta.',empresas:'empresas: tom profissional, foco em conversão, reputação, WhatsApp, Instagram e atendimento.'})[a]||'empresas: foco comercial.'}
function contentType(t){return({post:'Crie um post curto para rede social.',legenda:'Crie legenda para Instagram com gancho, corpo e CTA.',whatsapp:'Crie mensagem de vendas para WhatsApp, natural e objetiva.',calendario:'Crie calendário semanal com 5 ideias de conteúdo.',aula:'Crie atividade educativa simples, segura e divertida.',empresa:'Crie campanha comercial com oferta, canais e CTA.'})[t]||'Crie um post.'}
app.get('/api/health',(req,res)=>res.json({ok:true,app:'Nexa Digital Públicos'}));app.get('/api/plans',(req,res)=>res.json({plans:PLANS}));app.get('/api/me',(req,res)=>{const u=getUser(req);res.json({user:u?safeUser(u):null})});
app.post('/api/signup',async(req,res)=>{const{name,email,password}=req.body||{};if(!name||!email||!password)return res.status(400).json({error:'Nome, e-mail e senha são obrigatórios.'});const key=String(email).toLowerCase().trim();if(users.has(key))return res.status(409).json({error:'Este e-mail já está cadastrado.'});const user={name,email:key,passwordHash:await bcrypt.hash(password,10),plan:'free',credits:PLANS.free.credits,createdAt:new Date().toISOString()};users.set(key,user);history.set(key,[]);setSession(res,key);res.json({user:safeUser(user)})});
app.post('/api/login',async(req,res)=>{const{email,password}=req.body||{},key=String(email||'').toLowerCase().trim(),u=users.get(key);if(!u||!(await bcrypt.compare(password||'',u.passwordHash)))return res.status(401).json({error:'E-mail ou senha inválidos.'});setSession(res,key);res.json({user:safeUser(u)})});
app.post('/api/logout',(req,res)=>{const t=req.cookies.session;if(t)sessions.delete(t);res.clearCookie('session');res.json({ok:true})});
app.post('/api/checkout',auth,async(req,res)=>{
  const{plan}=req.body||{};
  if(!PLANS[plan]||plan==='free')return res.status(400).json({error:'Plano inválido.'});
  const selected=PLANS[plan];
  res.json({
    ok:true,
    provider:'ngcash',
    plan,
    planName:selected.name,
    price:selected.price,
    credits:selected.credits,
    paymentLink:NG_CASH_PAYMENT_LINK,
    pixKey:NG_CASH_PIX_KEY,
    contact:NG_CASH_CONTACT,
    message:`Pagamento NG.CASH para o plano ${selected.name}. Após pagar, envie o comprovante para liberação dos créditos.`
  });
});
app.post('/api/checkout/mock',auth,(req,res)=>{
  const{plan}=req.body||{};
  if(process.env.NODE_ENV==='production')return res.status(403).json({error:'Upgrade demo desativado em produção.'});
  if(!PLANS[plan]||plan==='free')return res.status(400).json({error:'Plano inválido.'});
  req.user.plan=plan;req.user.credits+=PLANS[plan].credits;
  res.json({ok:true,user:safeUser(req.user),message:`Plano ${PLANS[plan].name} ativado em modo demonstração.`})
});
app.get('/api/history',auth,(req,res)=>res.json({items:history.get(req.user.email)||[]}));
app.post('/api/generate',auth,async(req,res)=>{const{audience:aud,type,businessName,topic,tone}=req.body||{};if(!topic)return res.status(400).json({error:'Informe o tema.'});if(req.user.credits<=0)return res.status(402).json({error:'Seus créditos acabaram. Faça upgrade.'});const prompt=`Você é o Nexa Digital. Público: ${audience(aud)} Tipo: ${contentType(type)} Marca: ${businessName||'não informado'} Tema: ${topic}. Tom: ${tone||'claro e persuasivo'}. Entregue em pt-BR com título, conteúdo pronto, CTA e hashtags quando fizer sentido. Para crianças, mantenha segurança e supervisão adulta.`;let content;if(OPENAI_API_KEY){const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${OPENAI_API_KEY}`},body:JSON.stringify({model:OPENAI_MODEL,messages:[{role:'system',content:'Crie conteúdo útil, seguro e comercialmente aplicável.'},{role:'user',content:prompt}],temperature:.7})});if(!r.ok)return res.status(502).json({error:'Falha na IA. Verifique OPENAI_API_KEY.'});const d=await r.json();content=d.choices?.[0]?.message?.content||'Sem resposta da IA.'}else{content=`Título: ${topic}\n\nConteúdo pronto:\n${businessName||'Sua marca'} apresenta uma ideia para ${aud||'seu público'}: ${topic}. Use tom ${tone||'claro'}, destaque o benefício e convide para agir.\n\nCTA: Responda para saber mais.\n\n#NexaDigital #ConteudoComIA #MarketingDigital\n\nModo demonstração: configure OPENAI_API_KEY para IA real.`}req.user.credits--;const item={id:crypto.randomUUID(),createdAt:new Date().toISOString(),audience:aud,type,topic,content};const list=history.get(req.user.email)||[];list.unshift(item);history.set(req.user.email,list.slice(0,50));res.json({content,credits:req.user.credits,item})});
app.listen(PORT,()=>console.log(`Nexa Digital Públicos rodando na porta ${PORT}`));
