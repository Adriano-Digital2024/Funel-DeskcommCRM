---
impacto: nada_mudou
secao: corrigido
titulo: A conferência de imagens do instalador passa a olhar o registro que a instalação usa
---

Antes de baixar as imagens, o instalador confere se as três existem e são
públicas. Essa conferência olhava sempre para o registro do projeto, mesmo em
instalações configuradas para usar outro — então ela dizia "está tudo publicado"
depois de conferir pacotes que não eram os que a instalação ia baixar, e o erro
só aparecia mais tarde, na hora de subir. Agora ela olha o mesmo registro que a
instalação usa.

Nada muda para quem não trocou o registro: continua conferindo os mesmos
pacotes, com o mesmo resultado.
