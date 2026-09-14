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
          Última atualização: setembro de 2026
        </p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              1. Quem somos
            </h2>
            <p>
              O FP Pipe é uma plataforma de prospecção B2B: monta o perfil do
              seu cliente ideal, busca empresas, pontua cada uma e identifica
              decisores. Esta política explica quais dados tratamos, por quê e
              quais são os seus direitos segundo a Lei Geral de Proteção de
              Dados (Lei nº 13.709/2018 — LGPD).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              2. Quais dados coletamos
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Dados de cadastro:</strong> e-mail, nome da empresa,
                produtos ou serviços e informações que você preenche no perfil.
              </li>
              <li>
                <strong>Preferências de prospecção:</strong> segmentos, portes
                e regiões que você escolhe ao montar listas (ICP).
              </li>
              <li>
                <strong>Dados públicos de empresas:</strong> informações
                empresariais obtidas de fontes públicas, como CNPJ, razão
                social, endereço e situação cadastral.
              </li>
              <li>
                <strong>Dados de contato comercial:</strong> e-mails e
                telefones profissionais localizados por serviços terceirizados
                de dados quando você usa os recursos de contato do produto.
              </li>
              <li>
                <strong>Dados de uso:</strong> registro de consumo de créditos
                e listas geradas, para controle de limites e cobrança.
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
              <li>Processar pagamentos e prestar suporte.</li>
              <li>Melhorar o produto de forma agregada e anonimizada.</li>
            </ul>
            <p className="mt-3">
              Quando usamos serviços de inteligência artificial para gerar
              textos, seus dados não são usados por esses provedores para
              treinar modelos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              4. Com quem compartilhamos
            </h2>
            <p>
              Não vendemos seus dados. Compartilhamos apenas o necessário com
              provedores de hospedagem, autenticação, pagamento, dados públicos
              e inteligência artificial, todos sujeitos a obrigações de
              confidencialidade e segurança.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              5. Seus direitos (LGPD)
            </h2>
            <p>
              Você pode solicitar a qualquer momento confirmação de tratamento,
              acesso aos seus dados, correção, portabilidade, anonimização,
              bloqueio, eliminação ou revogação do consentimento. Basta enviar
              um e-mail para{" "}
              <a
                href={`mailto:${CONTATO}`}
                className="text-pipe-blue hover:underline"
              >
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
              Usamos criptografia em trânsito, senhas protegidas por hash e
              controle de acesso por permissão no banco de dados. Mantemos seus
              dados enquanto sua conta existir; após a exclusão, removemos em
              até 30 dias.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Cookies</h2>
            <p>
              Utilizamos apenas cookies essenciais de sessão para manter você
              autenticado. Não usamos cookies de rastreamento publicitário.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              8. Atualizações e contato
            </h2>
            <p>
              Esta política pode ser atualizada com aviso prévio nesta página.
              Dúvidas:{" "}
              <a
                href={`mailto:${CONTATO}`}
                className="text-pipe-blue hover:underline"
              >
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