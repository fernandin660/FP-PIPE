import Link from "next/link";

export const metadata = {
  title: "Política de Privacidade — FP Pipe",
};

const CONTATO = "fernandopugliesi@fppipe.com.br";

export default function PaginaPrivacidade() {
  return (
    <main className="min-h-screen bg-pipe-bg text-gray-200">
      <div className="max-w-3xl mx-auto px-6 py-14">
        <Link
          href="/"
          className="text-pipe-muted text-sm hover:text-white transition"
        >
          ← Voltar
        </Link>

        <h1 className="font-display text-4xl text-white mt-6">
          Política de Privacidade
        </h1>
        <p className="text-pipe-muted text-sm mt-2">
          Última atualização: agosto de 2026
        </p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              1. Quem somos
            </h2>
            <p>
              O FP Pipe é uma plataforma de inteligência comercial que ajuda
              empresas B2B a encontrarem clientes potenciais: monta o perfil de
              cliente ideal, busca empresas reais com CNPJ, pontua cada uma e
              identifica os decisores. Esta política explica quais dados
              tratamos, por quê e quais são os seus direitos segundo a Lei
              Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              2. Quais dados coletamos
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Dados de cadastro:</strong> e-mail, nome da empresa,
                produtos/serviços e informações que você preenche no perfil da
                sua empresa.
              </li>
              <li>
                <strong>Dados do seu ICP:</strong> segmentos, portes e regiões
                que você escolhe ao gerar listas.
              </li>
              <li>
                <strong>Dados públicos de empresas:</strong> CNPJ, razão
                social, endereço, porte e situação cadastral, obtidos de fontes
                públicas (Receita Federal / Casa dos Dados).
              </li>
              <li>
                <strong>Dados de contato comercial:</strong> quando você usa o
                Buscador de Contatos, consultamos serviços especializados
                (AnymailFinder) para localizar e-mails profissionais verificados
                associados a perfis públicos do LinkedIn informados por você.
              </li>
              <li>
                <strong>Dados de uso:</strong> registros de consumo de créditos
                e listas geradas, para cobrança e limites do plano.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              3. Como usamos seus dados
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Fornecer o serviço: gerar listas, scores e abordagens.</li>
              <li>Controlar limites e créditos do seu plano.</li>
              <li>Processar pagamentos via Mercado Pago.</li>
              <li>Suporte e comunicação sobre sua conta.</li>
              <li>
                Melhorar o produto de forma agregada e anonimizada.
              </li>
            </ul>
            <p className="mt-3">
              Para personalizar conteúdo usamos inteligência artificial
              (OpenAI). Os dados da SUA empresa enviados para gerar textos não
              são usados pela OpenAI para treinar modelos, conforme a política
              de uso de API deles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              4. Com quem compartilhamos
            </h2>
            <p>Não vendemos seus dados. Compartilhamos apenas o necessário:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>Supabase</strong> — armazenamento e autenticação;</li>
              <li><strong>Vercel</strong> — hospedagem da aplicação;</li>
              <li><strong>Mercado Pago</strong> — pagamentos;</li>
              <li><strong>OpenAI</strong> — geração de conteúdo com IA;</li>
              <li><strong>Casa dos Dados</strong> — consulta de CNPJs;</li>
              <li><strong>AnymailFinder</strong> — busca de e-mails verificados.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              5. Seus direitos (LGPD)
            </h2>
            <p>
              Você pode solicitar a qualquer momento: confirmação de
              tratamento, acesso aos seus dados, correção, portabilidade,
              anonimização, bloqueio ou eliminação, informação sobre
              compartilhamentos e revogação do consentimento. Basta enviar um
              e-mail para{" "}
              <a href={`mailto:${CONTATO}`} className="text-pipe-blue hover:underline">
                {CONTATO}
              </a>
              . A exclusão da conta implica a eliminação dos dados pessoais
              vinculados, exceto aqueles que a lei obriga a manter.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              6. Segurança e retenção
            </h2>
            <p>
              Usamos criptografia em trânsito (HTTPS), senhas protegidas por
              hash e controle de acesso por linha (RLS) no banco de dados.
              Mantemos seus dados enquanto sua conta existir; após exclusão,
              removemos em até 30 dias.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              7. Cookies
            </h2>
            <p>
              Utilizamos apenas cookies essenciais de sessão para mantê-lo
              autenticado. Não usamos cookies de rastreamento publicitário.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. Contato</h2>
            <p>
              Dúvidas sobre esta política:{" "}
              <a href={`mailto:${CONTATO}`} className="text-pipe-blue hover:underline">
                {CONTATO}
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 flex gap-6 text-sm">
          <Link href="/termos" className="text-pipe-blue hover:underline">
            Termos de Uso →
          </Link>
        </div>
      </div>
    </main>
  );
}
