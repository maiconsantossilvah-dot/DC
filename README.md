# Atlas Dracônico

Catálogo responsivo de dragões do Dragon City, com pesquisa por nome ou família, filtros, skins, buffs, golpes e prévias animadas.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub e envie o conteúdo desta pasta.
2. No repositório, abra **Settings → Pages**.
3. Em **Build and deployment**, selecione **Deploy from a branch**.
4. Escolha a branch `main`, a pasta `/ (root)` e salve.

O arquivo `index.html` já está na raiz e não precisa de processo de build.

## Catálogo

O projeto inclui mais de 2.200 dragões distribuídos entre as raridades Comum, Raro, Muito raro, Épico, Lendário, Mítico e Heroico. Famílias VIP como Karma, Vampire, Titan, Corrupted, Ascended, Redemption, Arcana, Plasma, Eternal e outras têm filtros próprios.

Os dados compilados ficam em `dragons-data.js`. Para atualizar o catálogo e as informações de skins a partir do Ditlep, execute:

```powershell
node scripts/sync-ditlep.mjs
```
