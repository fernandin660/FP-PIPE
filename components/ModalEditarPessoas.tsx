"use client";

import { useState } from "react";

export type DadosPessoas = {
  aprovadorNome: string;
  aprovadorCargo: string;
  aprovadorLinkedin: string;
  aprovadorTelefone: string;
  aprovadorEmail: string;
  campeaoNome: string;
  campeaoCargo: string;
  campeaoLinkedin: string;
  campeaoTelefone: string;
  campeaoEmail: string;
  empresaLinkedin: string;
  empresaNome: string;
  empresaEndereco: string;
  empresaCidade: string;
  empresaUf: string;
  empresaTelefone: string;
  empresaEmail: string;
};

export default function ModalEditarPessoas({
  aberto,
  dadosIniciais,
  onFechar,
  onSalvar,
  onAcharLinkedin,
}: {
  aberto: boolean;
  dadosIniciais: DadosPessoas;
  onFechar: () => void;
  onSalvar: (dados: DadosPessoas) => void;
  onAcharLinkedin?: () => Promise<{
    linkedin: string | null;
    mensagem: string;
  }>;
}) {
  const [dados, setDados] = useState<DadosPessoas>(dadosIniciais);
  const [buscandoLinkedin, setBuscandoLinkedin] = useState(false);
  const [avisoLinkedin, setAvisoLinkedin] = useState("");

  if (!aberto) return null;

  const atualizar = (campo: keyof DadosPessoas, valor: string) =>
    setDados((atual) => ({ ...atual, [campo]: valor }));

  const acharLinkedin = async () => {
    if (!onAcharLinkedin || buscandoLinkedin) return;

    setBuscandoLinkedin(true);
    setAvisoLinkedin("");

    try {
      const resultado = await onAcharLinkedin();

      if (resultado.linkedin) {
        atualizar("empresaLinkedin", resultado.linkedin);
      }

      setAvisoLinkedin(resultado.mensagem);
    } finally {
      setBuscandoLinkedin(false);
    }
  };

  const classesInput =
    "w-full bg-pipe-dark border border-pipe-border rounded-lg p-2.5 focus:border-pipe-blue focus:outline-none placeholder:text-pipe-muted/60 text-white text-sm";
  const classesLabel = "text-[11px] text-pipe-muted";

  function submeter(e: React.FormEvent) {
    e.preventDefault();
    onSalvar(dados);
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center px-6"
      onClick={onFechar}
    >
      <div
        className="w-full max-w-lg bg-pipe-card border border-pipe-border rounded-xl p-8 relative shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onFechar}
          className="absolute top-4 right-4 text-pipe-muted hover:text-white text-xl transition"
          aria-label="Fechar"
        >
          ✕
        </button>

        <h2 className="font-display text-3xl text-white">
          Editar <span className="text-pipe-lime">pessoas do lead</span>
        </h2>

        <p className="text-pipe-muted text-sm mt-2">
          Achou as pessoas no LinkedIn? Cole aqui o link e os contatos diretos.
          Fica salvo na sua base — e é por esses dados que buscamos no Apollo.
        </p>

        <form onSubmit={submeter} className="space-y-6 mt-6">
          {/* APROVADOR */}
          <div className="border border-purple-500/30 rounded-lg p-4">
            <p className="text-sm font-bold text-purple-400 mb-3">
              🟣 Aprovador (quem assina a compra)
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={classesLabel}>Nome</label>
                <input
                  value={dados.aprovadorNome}
                  onChange={(e) => atualizar("aprovadorNome", e.target.value)}
                  placeholder="Ex.: Roberto Vilela"
                  className={`${classesInput} mt-1`}
                />
              </div>
              <div>
                <label className={classesLabel}>Cargo</label>
                <input
                  value={dados.aprovadorCargo}
                  onChange={(e) => atualizar("aprovadorCargo", e.target.value)}
                  placeholder="Ex.: Administrador"
                  className={`${classesInput} mt-1`}
                />
              </div>
              <div className="col-span-2">
                <label className={classesLabel}>LinkedIn do perfil</label>
                <input
                  type="url"
                  value={dados.aprovadorLinkedin}
                  onChange={(e) =>
                    atualizar("aprovadorLinkedin", e.target.value)
                  }
                  placeholder="https://www.linkedin.com/in/roberto-vilela/"
                  className={`${classesInput} mt-1`}
                />
              </div>
              <div>
                <label className={classesLabel}>Telefone pessoal</label>
                <input
                  value={dados.aprovadorTelefone}
                  onChange={(e) =>
                    atualizar("aprovadorTelefone", e.target.value)
                  }
                  placeholder="(16) 99999-0000"
                  className={`${classesInput} mt-1`}
                />
              </div>
              <div>
                <label className={classesLabel}>E-mail pessoal</label>
                <input
                  type="email"
                  value={dados.aprovadorEmail}
                  onChange={(e) => atualizar("aprovadorEmail", e.target.value)}
                  placeholder="roberto@empresa.com.br"
                  className={`${classesInput} mt-1`}
                />
              </div>
            </div>
          </div>

          {/* CAMPEÃO */}
          <div className="border border-lime-500/30 rounded-lg p-4">
            <p className="text-sm font-bold text-pipe-lime mb-3">
              🎯 Influenciador (quem recebe sua proposta)
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={classesLabel}>Nome</label>
                <input
                  value={dados.campeaoNome}
                  onChange={(e) => atualizar("campeaoNome", e.target.value)}
                  placeholder="Ex.: Carlos Mendes"
                  className={`${classesInput} mt-1`}
                />
              </div>
              <div>
                <label className={classesLabel}>Cargo</label>
                <input
                  value={dados.campeaoCargo}
                  onChange={(e) => atualizar("campeaoCargo", e.target.value)}
                  placeholder="Ex.: Gerente de TI"
                  className={`${classesInput} mt-1`}
                />
              </div>
              <div className="col-span-2">
                <label className={classesLabel}>LinkedIn do perfil</label>
                <input
                  type="url"
                  value={dados.campeaoLinkedin}
                  onChange={(e) =>
                    atualizar("campeaoLinkedin", e.target.value)
                  }
                  placeholder="https://www.linkedin.com/in/carlos-mendes/"
                  className={`${classesInput} mt-1`}
                />
              </div>
              <div>
                <label className={classesLabel}>Telefone pessoal</label>
                <input
                  value={dados.campeaoTelefone}
                  onChange={(e) =>
                    atualizar("campeaoTelefone", e.target.value)
                  }
                  placeholder="(16) 99999-0000"
                  className={`${classesInput} mt-1`}
                />
              </div>
              <div>
                <label className={classesLabel}>E-mail pessoal</label>
                <input
                  type="email"
                  value={dados.campeaoEmail}
                  onChange={(e) => atualizar("campeaoEmail", e.target.value)}
                  placeholder="carlos@empresa.com.br"
                  className={`${classesInput} mt-1`}
                />
              </div>
            </div>
          </div>

          {/* EMPRESA */}
          <div className="border border-pipe-border rounded-lg p-4">
            <p className="text-sm font-bold text-pipe-blue mb-3">
              🏢 Dados da empresa
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={classesLabel}>Nome</label>
                <input
                  value={dados.empresaNome}
                  onChange={(e) => atualizar("empresaNome", e.target.value)}
                  placeholder="Ex.: Sertran Transportes"
                  className={`${classesInput} mt-1`}
                />
              </div>
              <div className="col-span-2">
                <label className={classesLabel}>Endereço</label>
                <input
                  value={dados.empresaEndereco}
                  onChange={(e) => atualizar("empresaEndereco", e.target.value)}
                  placeholder="Av. Paulista, 1000 - Sala 12"
                  className={`${classesInput} mt-1`}
                />
              </div>
              <div>
                <label className={classesLabel}>Cidade</label>
                <input
                  value={dados.empresaCidade}
                  onChange={(e) => atualizar("empresaCidade", e.target.value)}
                  placeholder="Ex.: Ribeirão Preto"
                  className={`${classesInput} mt-1`}
                />
              </div>
              <div>
                <label className={classesLabel}>UF</label>
                <input
                  value={dados.empresaUf}
                  maxLength={2}
                  onChange={(e) =>
                    atualizar("empresaUf", e.target.value.toUpperCase())
                  }
                  placeholder="SP"
                  className={`${classesInput} mt-1 uppercase`}
                />
              </div>
              <div>
                <label className={classesLabel}>Telefone</label>
                <input
                  value={dados.empresaTelefone}
                  onChange={(e) => atualizar("empresaTelefone", e.target.value)}
                  placeholder="(16) 3333-0000"
                  className={`${classesInput} mt-1`}
                />
              </div>
              <div>
                <label className={classesLabel}>E-mail</label>
                <input
                  type="email"
                  value={dados.empresaEmail}
                  onChange={(e) => atualizar("empresaEmail", e.target.value)}
                  placeholder="contato@empresa.com.br"
                  className={`${classesInput} mt-1`}
                />
              </div>
              <div className="col-span-2">
                <label className={classesLabel}>LinkedIn da empresa</label>
                <input
                  type="url"
                  value={dados.empresaLinkedin}
                  onChange={(e) => atualizar("empresaLinkedin", e.target.value)}
                  placeholder="https://www.linkedin.com/company/sertran-transportes/"
                  className={`${classesInput} mt-1`}
                />

                {onAcharLinkedin && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => void acharLinkedin()}
                      disabled={buscandoLinkedin}
                      className="text-[11px] font-semibold bg-pipe-blue/10 text-pipe-blue border border-pipe-blue/30 px-2.5 py-1.5 rounded-lg hover:bg-pipe-blue/20 disabled:opacity-50 transition"
                      title="Busca o LinkedIn da empresa no Google e preenche automaticamente"
                    >
                      {buscandoLinkedin
                        ? "🔎 Buscando..."
                        : "🔍 Achar LinkedIn no Google (1 crédito)"}
                    </button>

                    {avisoLinkedin && (
                      <p className="text-[11px] text-pipe-muted mt-1.5">
                        {avisoLinkedin}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-pipe-lime text-black font-bold py-3 rounded-lg hover:opacity-90 transition"
          >
            Salvar fichas →
          </button>
        </form>
      </div>
    </div>
  );
}
