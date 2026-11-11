# Pesquisa de Segurança Digital

Aplicação de pesquisa com formulário e dashboard para análise dos dados coletados.

## Requisitos

- Conta no Netlify
- Variável de ambiente: `SURVEY_ADMIN_PASSWORD`

## Configuração no Netlify

1. Faça o deploy da pasta deste projeto no Netlify.
2. Em Site configuration > Environment variables, adicione:
   - `SURVEY_ADMIN_PASSWORD=SuaSenhaSecreta`
3. Publique o site.

## Acesso administrativo

O painel com as respostas completas fica protegido por senha. Use a senha configurada em `SURVEY_ADMIN_PASSWORD`.

## Teste local

```bash
npm install
npx netlify dev
```

A aplicação ficará disponível em `http://localhost:8888`.
