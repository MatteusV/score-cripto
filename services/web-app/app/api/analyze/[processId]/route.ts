import { NextResponse } from "next/server"
import { processes } from "../route"

const MOCK_DELAY_MS = 4_000

function mockScore(address: string) {
  let hash = 0
  for (let i = 0; i < address.length; i++) {
    hash = (hash * 31 + address.charCodeAt(i)) | 0
  }
  return Math.abs(hash % 101)
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ processId: string }> },
) {
  const { processId } = await params
  const process = processes.get(processId)

  if (!process) {
    return NextResponse.json(
      { error: "Process not found" },
      { status: 404 },
    )
  }

  const elapsed = Date.now() - process.createdAt

  if (elapsed < MOCK_DELAY_MS) {
    return NextResponse.json({
      status: elapsed < MOCK_DELAY_MS / 2 ? "pending" : "processing",
      processId,
      chain: process.chain,
      address: process.address,
    })
  }

  const score = mockScore(process.address)
  const confidence = 0.7 + (score / 100) * 0.25

  return NextResponse.json({
    status: "completed",
    processId,
    chain: process.chain,
    address: process.address,
    result: {
      score,
      confidence: Math.round(confidence * 100) / 100,
      reasoning:
        score >= 70
          ? "Carteira com histórico consistente e diversificado. Padrões de transação indicam uso legítimo com boa diversidade de contrapartes."
          : score >= 40
            ? "Carteira com sinais mistos. Alguns indicadores positivos, mas padrões de risco moderado detectados na análise on-chain."
            : "Carteira com múltiplos indicadores de risco. Padrões suspeitos detectados incluindo interações com endereços sinalizados.",
      positiveFactors:
        score >= 50
          ? [
              "Idade da carteira acima de 2 anos",
              "Diversidade de contrapartes alta",
              "Volume de transações consistente",
              "Interacao com protocolos DeFi verificados",
            ].slice(0, 2 + Math.floor(score / 30))
          : ["Carteira ativa recentemente"],
      riskFactors:
        score < 50
          ? [
              "Interacao com mixer detectada",
              "concentração exagerada em poucas contrapartes",
              "Padrao de transação atipico",
              "Proximidade com endereços sancionados",
            ].slice(0, 2 + Math.floor((100 - score) / 30))
          : score < 70
            ? ["concentração moderada em poucas contrapartes"]
            : [],
      modelVersion: "mock-v1.0",
      promptVersion: "mock-v2.1.0",
    },
  })
}
