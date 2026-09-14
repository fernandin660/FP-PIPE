import Link from "next/link";

export const metadata = {
  title: "Termos de Uso — FP Pipe",
};

const CONTATO = "fernandopugliesi@fppipe.com.br";

export default function PaginaTermos() {
  return (
    <main className="min-h-screen bg-pipe-bg text-gray-200">
      <div className="max-w-3xl mx-auto px-6 py-14">
        <Link
          href="/"
          className="text-pipe-muted text-sm hover:text-white transition"
        >
          ← Voltar
        </Link>

        <h1 className="font-display text-4xl text-white mt-6">Termos de Uso</h1>
        <p className="text-pipe-muted text-sm mt-2">
          Última atualização: setembro de 2026
        </p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Objeto</h2>
            <p>
              O FP Pipe é uma plataforma de prospecção B2B que ajuda você a
              montar listas de empresas com o perfil do seu cliente ideal,
              identificar quem decide a compra e preparar a primeira abordagem.
              O uso do serviço está sujeito a estes Termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              2. Conta do usuário
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Você deve fornecer informações verdadeiras e manter seus dados
                de cadastro atualizados.
              </li>
              <li>
                Sua conta e senha são pessoais e intransferíveis; você é
                responsável pelo uso que se fizer delas.
              </li>
              <li>
                É proibido criar múltiplas contas para acumular créditos
                gratuitos ou benefícios de teste.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              3. Planos, pagamento e reembolso
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                O funcionamento dos planos, limites e créditos está descrito na
                página de planos do produto, que integra estes Termos.
              </li>
              <li>
                Os pagamentos são processados por serviços de pagamento de
                terceiros; não armazenamos dados de cartão.
              </li>
              <li>
                Conforme o art. 49 do Código de Defesa do Consumidor, você pode
                desistir da compra em até{" "}
                <strong>7 (sete) dias corridos</strong> após a contratação, com
                reembolso integral, pelo e-mail{" "}
                <a
                  href={`mailto:${CONTATO}`}
                  className="text-pipe-blue hover:underline"
                >
                  {CONTATO}
                </a>
                .
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              4. Uso aceitável
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                As listas e contatos obtidos são para prospecção comercial
                legítima da sua empresa.
              </li>
              <li>
                É proibido revender, redistribuir ou publicar os dados obtidos,
                usar o serviço para spam ou atividades ilícitas, automatizar a
                coleta de dados da plataforma ou burlar limites e créditos.
              </li>
              <li>
                Você declara respeitar a legislação aplicável, incluindo a
                LGPD, ao utilizar os dados obtidos.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              5. Disponibilidade e suporte
            </h2>
            <p>
              Buscamos manter o serviço disponível, mas ele pode passar por
              manutenções ou depender de serviços de terceiros (provedores de
              dados, hospedagem e infraestrutura). Suporte:{" "}
              <a
                href={`mailto:${CONTATO}`}
                className="text-pipe-blue hover:underline"
              >
                {CONTATO}
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              6. Suspensão e encerramento
            </h2>
            <p>
              A violação destes Termos pode levar à suspensão da conta. Você
              pode encerrar o uso do serviço quando quiser, solicitando a
              exclusão da conta pelos canais de contato.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              7. Alterações destes Termos
            </h2>
            <p>
              Estes Termos podem ser atualizados para refletir mudanças no
              produto ou na legislação, com aviso prévio razoável e publicação
              nesta página.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              8. Legislação e foro
            </h2>
            <p>
              Aplica-se a legislação brasileira. Fica eleito o foro do
              domicílio do consumidor para dirimir eventuais disputas.
            </p>
          </section>
        </div>

        <div className="mt-12 flex gap-6 text-sm">
          <Link href="/privacidade" className="text-pipe-blue hover:underline">
            Política de Privacidade →
          </Link>
        </div>
      </div>
    </main>
  );
}