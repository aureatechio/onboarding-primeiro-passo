# Codex Prompts

Esta pasta contem versoes adaptadas dos slash commands originais de `.claude/commands/`.

Como usar:
- Abra o arquivo do prompt desejado e use o conteudo como instrucao para o Codex.
- Quando o prompt mencionar argumentos, informe o valor na mesma mensagem.
- Prompts que dependem de Supabase, Linear ou navegador devem usar as ferramentas/conectores disponiveis no Codex.

Manutencao:
- Mantenha comandos genericos em Markdown simples.
- Evite referencias diretas a Claude, Cursor ou MCP quando a intencao for funcionar no Codex.
- Para comandos de navegador, prefira Browser Use / in-app browser.
- Para Supabase, siga sempre as regras de deploy e seguranca do `AGENTS.md`.
