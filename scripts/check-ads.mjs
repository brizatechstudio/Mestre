import fs from 'node:fs'

const read = (file) => fs.readFileSync(file, 'utf8')
const checks = []
const check = (name, condition) => checks.push({ name, condition: Boolean(condition) })

const layout = read('src/components/Layout.tsx')
const banner = read('src/components/WebAdBanner.tsx')
const rewarded = read('src/lib/rewardedAds.ts')
const env = read('src/lib/env.ts')
const html = read('index.html')
const app = read('src/App.tsx')

check('Banner montado no Layout global', layout.includes('<WebAdBanner placement={page} />'))
check('Banner exibido no plano grátis em produção', layout.includes("plan === 'free' || adPreview"))
check('Prévia local pode forçar o banner sem afetar produção', app.includes('adPreview={!usingFirebaseBackend && appEnv.ads.bannerPreview}'))
check('Prévia local padrão mantém recursos premium liberados', env.includes("previewPlan: (value('VITE_PREVIEW_PLAN') === 'free' ? 'free' : 'pro')"))
check('Login pode ficar desativado sem iniciar Firebase', env.includes("appEnv.loginEnabled && appEnv.backendMode === 'firebase'"))
check('App respeita VITE_LOGIN_ENABLED antes da tela de setup/login', app.includes("appEnv.loginEnabled && appEnv.backendMode === 'firebase'"))
check('GPT oficial carregado por HTTPS', banner.includes('https://securepubads.g.doubleclick.net/tag/js/gpt.js'))
check('Banner desktop 970x90 / 728x90', banner.includes('[[970, 90], [728, 90]]'))
check('Banner tablet 728x90 / 468x60', banner.includes('[[728, 90], [468, 60]]'))
check('Banner mobile 320x100 / 320x50', banner.includes('[[320, 100], [320, 50]]'))
check('Slot antigo destruído ao trocar de tela', banner.includes('destroySlots([slot])'))
check('Banner trata resposta sem preenchimento', banner.includes("event.isEmpty ? 'empty' : 'ready'"))
check('Rewarded só concede acesso após rewardedSlotGranted', rewarded.includes('rewardedSlotGranted') && rewarded.includes("granted ? 'granted' : 'closed'"))
check('Rewarded trata slot não suportado/sem inventário', rewarded.includes("resolve('unavailable')"))
check('Viewport compatível com rewarded web mobile', /width=device-width,\s*initial-scale=1(?:\.0)?/.test(html))

console.log('\nMESTRE 1.5.3 — verificação estrutural de anúncios\n')
for (const item of checks) console.log(`[${item.condition ? 'OK ' : 'ERRO'}] ${item.name}`)
const failures = checks.filter((item) => !item.condition)
console.log(`\n${failures.length ? `${failures.length} erro(s)` : 'Estrutura de banners e rewarded consistente'}.`)
if (failures.length) process.exitCode = 1
