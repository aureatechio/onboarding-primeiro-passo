Execute o gate de seguranca pre-push do repositorio e traga um relatorio objetivo:

1. Rode `npm run gate:prepush`.
2. Se falhar, identifique a causa raiz e os arquivos afetados.
3. Valide lockfile/package manager (npm-only).
4. Proponha correcao minima e segura.
5. Ao final, reporte: status, evidencias e proximos passos.
