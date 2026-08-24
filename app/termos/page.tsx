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
          Última atualização: agosto de 2026
        </p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              1. Objeto
            </h2>
            <p>
              Os presentes Termos regulam o uso da plataforma FP Pipe, que
              oferece inteligência comercial B2B: definição de perfil de
              cliente ideal (ICP), busca e pontuação de empresas por CNPJ,
              identificação de decisores, buscador de contatos verificados e
              geração de abordagens com IA.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              2. Conta do usuário
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Você deve fornecer informações verdadeiras no cadastro.</li>
              <li>
                Sua senha é pessoal e intransferível; você é responsável pelo
                uso da sua conta.
              </li>
              <li>
                É proibido criar múltiplas contas para acumular créditos grátis.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              3. Planos, créditos e pagamentos
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                O plano <strong>Teste grátis</strong> oferece 50 empresas/mês, 2
                listas, 5 buscas de contato e 2 abordagens com IA, para
                avaliação do serviço.
              </li>
              <li>
                Os planos pagos (Silver, Gold e Platinum) incluem cotas mensais
                de empresas, listas e créditos conforme divulgado na página de
                planos. Créditos são recarregados a cada ciclo pago e{" "}
                <strong>não se acumulam</strong> entre ciclos além do saldo
                vigente.
              </li>
              <li>
                Os pagamentos são processados pelo Mercado Pago. Não armazenamos
                dados de cartão.
              </li>
              <li>
                A assinatura é paga por ciclo escolhido (mensal ou anual),
                <strong> sem renovação automática</strong>: ao fim do ciclo, você
                pode renovar manualmente na plataforma. Avisaremos sobre a
                expiração dentro do produto.
              </li>
              <li>
                Preços podem ser reajustados com aviso prévio de 30 dias; o
                valor do seu ciclo em curso não muda.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              4. Direito de arrependimento
            </h2>
            <p>
              Conforme o art. 49 do Código de Defesa do Consumidor, você pode
              desistir da compra em até <strong>7 (sete) dias corridos</strong>{" "}
              após a contratação, com reembolso integral. Basta solicitar pelo
              e-mail{" "}
              <a href={`mailto:${CONTATO}`} className="text-pipe-blue hover:underline">
                {CONTATO}
              </a>
              . O estorno é feito pelo Mercado Pago no mesmo meio de pagamento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              5. Uso aceitável
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                As listas e contatos são para prospecção comercial legítima da
                SUA empresa.
              </li>
              <li>
                É proibido revender, redistribuir ou publicar os dados obtidos;
                usar para spam, esquemas ilegais ou concorrentes diretos do FP
                Pipe.
              </li>
              <li>
                É proibido automatizar scraping da plataforma ou burlar limites
                e créditos.
              </li>
              <li>
                Você declara respeitar a LGPD e as regras de comunicação
                comercial ao contactar os leads obtidos.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              6. Disponibilidade e suporte
            </h2>
            <p>
              Buscamos alta disponibilidade, mas o serviço pode passar por
              manutenções ou depender de serviços de terceiros (fontes de dados,
              IA, gateways). Suporte:{" "}
              <a href={`mailto:${CONTATO}`} className="text-pipe-blue hover:underline">
                {CONTATO}
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              7. Suspensão e encerramento
            </h2>
            <p>
              Violação destes Termos pode levar à suspensão imediata da conta,
              sem reembolso proporcional quando comprovada má-fé. Você pode
              encerrar a conta quando quiser solicitando por e-mail.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              8. Foro e legislação
            </h2>
            <p>
              Aplica-se a legislação brasileira. Fica eleito o foro do domicílio
              do consumidor para dirimir eventuais disputas.
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
