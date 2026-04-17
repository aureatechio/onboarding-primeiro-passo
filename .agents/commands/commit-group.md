Organize a worktree atual em commits menores e coesos por contexto.

Instrucoes:
1. Aplique imediatamente a skill `commit-group`.
2. Analise todas as alteracoes atuais (staged e unstaged).
3. Proponha os grupos logicos antes de commitar.
4. Execute os commits em sequencia, um por grupo, com mensagens claras e objetivas.
5. Ao final, reporte:
   - commits criados (hash curto + mensagem);
   - arquivos incluidos em cada commit;
   - status final da worktree.

Regras:
- Nao misturar contextos diferentes no mesmo commit.
- Nao incluir arquivos com segredos.
- Nao fazer push, a menos que solicitado.