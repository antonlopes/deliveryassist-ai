import {test,expect} from '@playwright/test';
const email=process.env.DEMO_OPERATOR_EMAIL,password=process.env.DEMO_OPERATOR_PASSWORD;
if(!email||!password)throw new Error('E2E requer DEMO_OPERATOR_EMAIL e DEMO_OPERATOR_PASSWORD');
async function login(page){await page.goto('/login');await page.getByLabel('E-mail').fill(email);await page.getByLabel('Senha').fill(password);await page.getByRole('button',{name:'Entrar no painel'}).click();await expect(page).toHaveURL(/dashboard/);}
test('J1: login, dashboard, pedidos e detalhe',async({page})=>{
 await login(page);await expect(page.getByText('Pedidos registrados')).toBeVisible();await page.getByRole('link',{name:'Pedidos',exact:true}).click();await expect(page.getByRole('heading',{name:'Pedidos'})).toBeVisible();await page.getByText('PED-1052').first().click();await expect(page.getByText('Informações do pedido')).toBeVisible();
});
test('J2: ocorrência manual, notas e timeline',async({page})=>{
 await login(page);await page.goto('/orders');await page.getByText('PED-1069').first().click();await page.getByRole('button',{name:'Nova ocorrência'}).click();await page.getByLabel('Descrição').fill('Ocorrência de teste em pedido fictício no ambiente de demonstração.');await page.getByRole('button',{name:'Registrar ocorrência'}).click();await expect(page.getByText('Acompanhamento')).toBeVisible();await page.getByLabel('Nova nota').fill('Nota E2E de acompanhamento fictício.');await page.getByRole('button',{name:'Adicionar nota'}).click();await expect(page.getByText('Nota E2E de acompanhamento fictício.')).toBeVisible();
});
test('J7/J8: operador não vê administração e logout revoga acesso',async({page})=>{
 await login(page);await page.goto('/admin/users');await expect(page.getByText('Acesso negado')).toBeVisible();await page.getByRole('button',{name:'Encerrar sessão'}).click();await expect(page).toHaveURL(/login/);await page.goto('/dashboard');await expect(page).toHaveURL(/login/);
});
test('UI responsiva: ações acessíveis em 360px',async({page})=>{
 await page.setViewportSize({width:360,height:740});await login(page);await page.getByRole('button',{name:'Abrir menu'}).click();await page.getByRole('link',{name:/Pedidos/}).click();await expect(page.getByRole('heading',{name:'Pedidos'})).toBeVisible();
});
