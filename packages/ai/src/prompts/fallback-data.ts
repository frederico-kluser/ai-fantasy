/**
 * The fallback lines (ai-integration §5.3 step 5): pt-BR templates for every
 * act × tone, as `[fala, gesto]`. Acts without speech have an empty `fala`.
 * The only placeholder is the vocative `, {alvo}`, replaced by the target's
 * name or removed when there is none. Data, not branches.
 */
import type { ActId, ToneId } from "@ai-fantasy/engine";

/** One template: speech and gesture. */
export type FallbackTemplate = readonly [fala: string, gesto: string];

/** Templates by act and tone; every combination has at least one. */
export const FALLBACK_LINES: Readonly<
  Record<ActId, Readonly<Record<ToneId, readonly FallbackTemplate[]>>>
> = {
  GREET: {
    WARM: [
      ["Que bom te ver, {alvo}!", "sorri e abre os braços"],
      ["Olá, {alvo}! Como você está?", "acena com carinho"],
    ],
    NEUTRAL: [["Olá, {alvo}.", "acena com a cabeça"]],
    PLAYFUL: [["Olha só quem apareceu, {alvo}!", "dá uma piscadela"]],
    SEDUCTIVE: [["Ora, ora… olá, {alvo}.", "sorri devagar"]],
    IRONIC: [["Que surpresa agradável, {alvo}.", "ergue uma sobrancelha"]],
    AGGRESSIVE: [["Você de novo, {alvo}?", "cruza os braços"]],
  },
  CHAT: {
    WARM: [["Sabe que eu gosto dessas conversas, {alvo}?", "chega mais perto"]],
    NEUTRAL: [["Pois é, as coisas andam assim por aqui.", "encosta-se na parede"]],
    PLAYFUL: [["Escuta essa, {alvo}, você não vai acreditar.", "ri baixinho"]],
    SEDUCTIVE: [["Fica mais um pouco, a conversa está boa.", "inclina-se para perto"]],
    IRONIC: [["Claro, porque tudo aqui faz muito sentido.", "revira os olhos"]],
    AGGRESSIVE: [["Já que vamos falar disso, vamos falar direito.", "gesticula com força"]],
  },
  ASK: {
    WARM: [["Me conta, {alvo}, como você tem passado?", "olha com atenção"]],
    NEUTRAL: [["Posso te perguntar uma coisa, {alvo}?", "inclina a cabeça"]],
    PLAYFUL: [["E aí, vai me contar ou vou ter que adivinhar?", "cutuca o braço"]],
    SEDUCTIVE: [["Me diz uma coisa só pra mim, {alvo}.", "fala mais baixo"]],
    IRONIC: [["E você espera que eu acredite nisso?", "cruza os braços"]],
    AGGRESSIVE: [["Responde logo, {alvo}: o que está acontecendo?", "dá um passo à frente"]],
  },
  TELL: {
    WARM: [["Quero que você saiba de uma coisa, {alvo}.", "segura a mão por um instante"]],
    NEUTRAL: [["Fiquei sabendo de uma coisa.", "fala em tom calmo"]],
    PLAYFUL: [["Tenho uma novidade que vai te fazer rir.", "esfrega as mãos"]],
    SEDUCTIVE: [["Vou te contar um segredinho, {alvo}.", "chega bem perto"]],
    IRONIC: [["Adivinha só o que aconteceu, que maravilha.", "suspira"]],
    AGGRESSIVE: [["Então escuta bem o que eu vou dizer.", "aponta o dedo"]],
  },
  PRAISE: {
    WARM: [["Você foi incrível, {alvo}, de verdade.", "sorri com orgulho"]],
    NEUTRAL: [["Bom trabalho, {alvo}.", "assente"]],
    PLAYFUL: [["Olha só, quem diria que você levava jeito!", "dá um tapinha no ombro"]],
    SEDUCTIVE: [["Você fica ainda melhor assim, {alvo}.", "olha demoradamente"]],
    IRONIC: [["Nossa, que feito admirável.", "bate palmas devagar"]],
    AGGRESSIVE: [["Pelo menos isso você fez direito.", "bufa"]],
  },
  TEASE: {
    WARM: [["Ah, {alvo}, você não tem jeito mesmo.", "ri com carinho"]],
    NEUTRAL: [["Você sempre faz isso, não é?", "dá de ombros"]],
    PLAYFUL: [["Aposto que você nem percebeu, {alvo}.", "segura o riso"]],
    SEDUCTIVE: [["Gosto quando você fica sem graça, {alvo}.", "morde o lábio"]],
    IRONIC: [["Que coragem, hein.", "sorri de canto"]],
    AGGRESSIVE: [["Olha quem fala, {alvo}.", "ri com desdém"]],
  },
  ACCUSE: {
    WARM: [["Eu esperava mais de você, {alvo}.", "baixa os olhos, triste"]],
    NEUTRAL: [["Foi você, {alvo}. Eu sei que foi.", "encara em silêncio"]],
    PLAYFUL: [["Te peguei, {alvo}, nem adianta negar.", "aponta, rindo"]],
    SEDUCTIVE: [["Você achou mesmo que eu não ia descobrir?", "sorri, com uma calma perigosa"]],
    IRONIC: [["Que coincidência, justo você por perto.", "ergue as sobrancelhas"]],
    AGGRESSIVE: [["A culpa é sua, {alvo}, e todo mundo vai saber!", "aponta o dedo"]],
  },
  REQUEST: {
    WARM: [["Você me ajudaria, {alvo}? Significaria muito.", "junta as mãos"]],
    NEUTRAL: [["Preciso de uma coisa, {alvo}.", "fala com calma"]],
    PLAYFUL: [["Faz isso por mim, vai, eu te devo uma.", "faz cara de pidão"]],
    SEDUCTIVE: [["Você não diria não pra mim, diria?", "toca de leve o braço"]],
    IRONIC: [["Seria pedir demais, imagino.", "suspira, teatral"]],
    AGGRESSIVE: [["Você vai fazer isso, {alvo}, e agora.", "aproxima-se, firme"]],
  },
  OFFER: {
    WARM: [["Se precisar de mim, {alvo}, estou aqui.", "estende a mão"]],
    NEUTRAL: [["Posso te ajudar com isso.", "oferece com um gesto"]],
    PLAYFUL: [["Hoje é seu dia de sorte, aceita?", "sorri, cheio de animação"]],
    SEDUCTIVE: [["Tenho algo pra você, {alvo}.", "sorri de um jeito enigmático"]],
    IRONIC: [["Quanta generosidade a minha, não é?", "sorri de lado"]],
    AGGRESSIVE: [["Pega logo antes que eu mude de ideia.", "estende a mão com impaciência"]],
  },
  APOLOGIZE: {
    WARM: [["Me desculpa, {alvo}. Eu errei com você.", "olha nos olhos"]],
    NEUTRAL: [["Peço desculpas.", "abaixa a cabeça"]],
    PLAYFUL: [["Tá bom, tá bom, foi mal!", "ergue as mãos, rindo"]],
    SEDUCTIVE: [["Deixa eu me redimir, {alvo}.", "fala baixinho"]],
    IRONIC: [["Mil perdões pela minha existência.", "faz uma reverência exagerada"]],
    AGGRESSIVE: [["Pronto, desculpa! Está bom assim?", "fala entre os dentes"]],
  },
  THREATEN: {
    WARM: [["Não me obrigue a fazer algo de que eu me arrependa, {alvo}.", "fala com pesar"]],
    NEUTRAL: [["Isso vai ter consequências.", "encara sem piscar"]],
    PLAYFUL: [["Cuidado, {alvo}, eu sei onde você dorme.", "sorri de um jeito estranho"]],
    SEDUCTIVE: [["Você não vai querer me ver com raiva, {alvo}.", "sussurra ao ouvido"]],
    IRONIC: [["Seria uma pena se algo acontecesse, não?", "sorri friamente"]],
    AGGRESSIVE: [["Faz isso de novo e você vai ver, {alvo}!", "cerra os punhos"]],
  },
  ACCEPT: {
    WARM: [["Claro, {alvo}, pode contar comigo.", "sorri e assente"]],
    NEUTRAL: [["Está bem.", "assente"]],
    PLAYFUL: [["Fechado! Mas você me deve essa.", "dá um soquinho no ombro"]],
    SEDUCTIVE: [["Pra você, {alvo}, eu aceito.", "sorri devagar"]],
    IRONIC: [["Ah, como eu poderia recusar?", "dá de ombros"]],
    AGGRESSIVE: [["Tá, tá, aceito. Agora me deixa.", "bufa"]],
  },
  REFUSE: {
    WARM: [["Sinto muito, {alvo}, mas não posso.", "toca o ombro com gentileza"]],
    NEUTRAL: [["Não.", "balança a cabeça"]],
    PLAYFUL: [["Nem pensar, nem em sonho!", "ri e se afasta"]],
    SEDUCTIVE: [["Hoje não, {alvo}. Quem sabe outro dia.", "sorri com mistério"]],
    IRONIC: [["Que proposta irrecusável… recuso.", "sorri de canto"]],
    AGGRESSIVE: [["Nem pensar, {alvo}! Esquece isso.", "vira as costas"]],
  },
  FAREWELL: {
    WARM: [["Se cuida, {alvo}. Até breve!", "abraça de leve"]],
    NEUTRAL: [["Até mais, {alvo}.", "acena"]],
    PLAYFUL: [["Fui! Não apronta sem mim.", "faz uma continência brincalhona"]],
    SEDUCTIVE: [["Vou sentir sua falta, {alvo}.", "olha para trás ao sair"]],
    IRONIC: [["Foi um prazer, como sempre.", "faz uma mesura"]],
    AGGRESSIVE: [["Já vou. E não me procure.", "sai batendo os pés"]],
  },
  STAY_SILENT: {
    WARM: [["", "escuta em silêncio, com um sorriso"]],
    NEUTRAL: [["", "fica em silêncio"]],
    PLAYFUL: [["", "segura o riso e não diz nada"]],
    SEDUCTIVE: [["", "observa em silêncio, sem desviar o olhar"]],
    IRONIC: [["", "ergue uma sobrancelha e não diz nada"]],
    AGGRESSIVE: [["", "encara em silêncio, de cara fechada"]],
  },
  MOVE: {
    WARM: [["", "caminha tranquilamente"]],
    NEUTRAL: [["", "muda de lugar"]],
    PLAYFUL: [["", "sai saltitando"]],
    SEDUCTIVE: [["", "caminha devagar, sem pressa"]],
    IRONIC: [["", "anda com passos exagerados"]],
    AGGRESSIVE: [["", "atravessa o lugar a passos duros"]],
  },
  APPROACH: {
    WARM: [["", "aproxima-se com um sorriso"]],
    NEUTRAL: [["", "aproxima-se"]],
    PLAYFUL: [["", "chega pulando para perto"]],
    SEDUCTIVE: [["", "aproxima-se devagar"]],
    IRONIC: [["", "chega perto, com desconfiança"]],
    AGGRESSIVE: [["", "avança em tom de ameaça"]],
  },
  WITHDRAW: {
    WARM: [["", "afasta-se com delicadeza"]],
    NEUTRAL: [["", "afasta-se"]],
    PLAYFUL: [["", "recua dando risada"]],
    SEDUCTIVE: [["", "afasta-se olhando por cima do ombro"]],
    IRONIC: [["", "recua com as mãos erguidas"]],
    AGGRESSIVE: [["", "afasta-se de repente"]],
  },
  LEAVE: {
    WARM: [["", "sai acenando"]],
    NEUTRAL: [["", "vai embora"]],
    PLAYFUL: [["", "sai dando uma risadinha"]],
    SEDUCTIVE: [["", "sai sem pressa, deixando um olhar"]],
    IRONIC: [["", "sai com uma reverência teatral"]],
    AGGRESSIVE: [["", "sai pisando duro"]],
  },
  TOUCH: {
    WARM: [["", "toca o ombro com carinho"]],
    NEUTRAL: [["", "toca o braço de leve"]],
    PLAYFUL: [["", "cutuca de brincadeira"]],
    SEDUCTIVE: [["", "acaricia a mão devagar"]],
    IRONIC: [["", "dá tapinhas condescendentes no ombro"]],
    AGGRESSIVE: [["", "empurra com força"]],
  },
};
