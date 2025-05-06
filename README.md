# Paggo OCR Backend

Este é o backend do projeto **Paggo OCR**, que realiza o upload de documentos, processa OCR (Reconhecimento Óptico de Caracteres) para extrair texto de imagens e utiliza um modelo LLM (Large Language Model) para fornecer explicações interativas sobre o conteúdo extraído.

## 📋 Funcionalidades

- **Upload de documentos**: Permite o envio de imagens (JPG, JPEG, PNG) para processamento.
- **Processamento OCR**: Extrai texto de imagens utilizando a biblioteca `tesseract.js`.
- **Armazenamento de resultados**: Salva os resultados do OCR no banco de dados associado ao usuário.
- **Listagem de documentos**: Lista documentos processados com suporte a paginação e busca.
- **Explicações interativas**: Integração com OpenAI para fornecer explicações baseadas no texto extraído.

---

## 🛠️ Tecnologias Utilizadas

- **Node.js**: Ambiente de execução JavaScript.
- **NestJS**: Framework para construção de APIs escaláveis.
- **Prisma**: ORM para interação com o banco de dados PostgreSQL.
- **Tesseract.js**: Biblioteca para OCR.
- **OpenAI**: Integração com modelos LLM (GPT-3.5-turbo).
- **Multer**: Middleware para upload de arquivos.
- **JWT**: Autenticação baseada em tokens.

---

## 📂 Estrutura do Projeto

```plaintext
.
├── api/
│   ├── .env                  # Variáveis de ambiente
│   ├── prisma/
│   │   ├── schema.prisma     # Definição do banco de dados
│   │   └── migrations/       # Migrações do banco de dados
│   ├── src/
│   │   ├── app.module.ts     # Módulo principal do NestJS
│   │   ├── main.ts           # Ponto de entrada da aplicação
│   │   ├── auth/             # Módulo de autenticação (JWT)
│   │   ├── ocr/              # Módulo de OCR
│   │   ├── llm/              # Módulo de integração com OpenAI
│   │   └── prisma.service.ts # Serviço para interação com o Prisma
│   ├── uploads/              # Diretório para armazenar uploads
│   └── generated/            # Código gerado pelo Prisma
└── [README.md]               # Documentação do projeto
```

## 🚀 Como Executar o Projeto

1. Pré-requisitos

- Node.js (v16 ou superior)
- PostgreSQL (banco de dados)
- OpenAI API Key (para integração com LLM)

2. Configuração do Ambiente

   Crie um arquivo .env na pasta api/ com as seguintes variáveis:

   ```bash
   DATABASE_URL=postgresql://<usuario>:<senha>@<host>:<porta>/<banco>
   OPENAI_API_KEY=<sua-chave-openai>
   NEXTAUTH_SECRET=<sua-chave-secreta-jwt>
   ```

3. Instalar Dependências
   Na pasta api/, execute:

   ```bash
   npm install
   ```

4. Configurar o Banco de Dados

   Gere o cliente Prisma e aplique as migrações:

   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

5. Crie a pasta uploads na na pasta api/

6. Iniciar o Servidor

   Execute o servidor em modo de desenvolvimento na pasta /api:

   ```bash
   npm run start:dev
   ```

   A API estará disponível em http://localhost:3001.

## 📖 Documentação da API

A API possui uma documentação interativa gerada pelo Swagger, que pode ser acessada em:

[https://nest-paggo-production.up.railway.app/api/docs](https://nest-paggo-production.up.railway.app/api/docs)

### **Principais Endpoints**

#### **1. Upload de Documento**

- **Método**: `POST`
- **URL**: `/ocr/upload`
- **Descrição**: Faz o upload de um documento para processamento OCR.
- **Headers**:
  - `Authorization: Bearer <token>`
- **Body (form-data)**:
  - `name` (string): Nome do documento.
  - `file` (file): Arquivo de imagem (JPG, JPEG, PNG).
- **Resposta**:
  ```json
  {
    "id": 1,
    "fileUrl": "./uploads/ocr-1697041234567-123456789.png",
    "text": "Texto extraído da imagem",
    "createdAt": "2023-10-11T12:34:56.789Z"
  }
  ```

2. Listar Documentos

- Método: GET
- URL: /ocr/list
- Descrição: Lista documentos processados com paginação e busca.
- Headers:
  - Authorization: Bearer <token>
- Query Params:
  - page (opcional): Número da página (padrão: 1).
  - search (opcional): Termo para busca no nome ou conteúdo.
- **Resposta**:

  ```json
  {
    "documents": [...],
    "totalPages": 5,
    "currentPage": 1
  }
  ```

3. Explicação Interativa

- Método: POST
- URL: /ocr/explain
- Descrição: Gera uma explicação interativa sobre o conteúdo de um documento.
- Headers:
  - Authorization: Bearer <token>
- **Body (JSON)**:

  ```json
  {
    "id": 1,
    "query": "Explique o termo 'nota fiscal' mencionado no documento."
  }
  ```

- **Resposta**:
  ```json
  {
    "explanation": "Explicação gerada pelo modelo LLM."
  }
  ```
  A documentação Swagger permite testar os endpoints diretamente na interface, facilitando a integração e o entendimento da API

## 🧪 Testes

### **Testes Unitários e de Integração**

O projeto inclui testes para garantir a funcionalidade e a estabilidade dos módulos. Para executar os testes unitários e de integração, utilize o comando na pasta /api:

```bash
  npm run test
```

Cobertura de Testes
Para gerar um relatório de cobertura de testes, execute na pasta /api:

```bash
  npm run test:cov
```

O relatório será gerado e exibirá a porcentagem de cobertura de código.

## 🛡️ Segurança

- **Autenticação JWT**: Todos os endpoints são protegidos por autenticação baseada em tokens JWT. Certifique-se de incluir o cabeçalho `Authorization: Bearer <token>` em todas as requisições protegidas.
- **Validação de Entrada**: O projeto utiliza `class-validator` e `ValidationPipe` para validar e transformar os dados de entrada, garantindo que apenas dados válidos sejam processados.
- **Proteção de Uploads**: Apenas arquivos de imagem (JPG, JPEG, PNG) são permitidos no endpoint de upload. Arquivos maiores que 5MB são rejeitados automaticamente.
- **Variáveis de Ambiente**: Informações sensíveis, como a chave da OpenAI e a URL do banco de dados, são armazenadas em variáveis de ambiente para evitar exposição no código-fonte.
- **Logs de Erros**: Logs detalhados são gerados para monitorar falhas e atividades suspeitas, ajudando na identificação de problemas de segurança.
