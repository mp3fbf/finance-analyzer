#!/usr/bin/env tsx
/**
 * Script de teste para validar API Key da Anthropic
 * Uso: npm run test:api
 */

import Anthropic from '@anthropic-ai/sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carregar .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-4-5-20250929';

console.log('🔐 Testando API Key da Anthropic\n');
console.log('─'.repeat(50));

if (!API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY não encontrada no .env.local');
  process.exit(1);
}

console.log('✅ API Key encontrada:', API_KEY.substring(0, 15) + '...');
console.log('🤖 Modelo a testar:', MODEL);
console.log('─'.repeat(50));

const anthropic = new Anthropic({
  apiKey: API_KEY,
});

async function testAPI() {
  try {
    console.log('\n🚀 Enviando mensagem de teste...\n');

    const startTime = Date.now();

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: 'Responda apenas "OK" se você está funcionando corretamente.',
        },
      ],
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('✅ SUCESSO! API respondeu em', duration + 's\n');
    console.log('─'.repeat(50));
    console.log('📊 Detalhes da resposta:');
    console.log('   Modelo:', message.model);
    console.log('   Tokens input:', message.usage.input_tokens);
    console.log('   Tokens output:', message.usage.output_tokens);
    console.log('   Stop reason:', message.stop_reason);

    const textContent = message.content.find((c) => c.type === 'text');
    if (textContent && textContent.type === 'text') {
      console.log('   Resposta:', textContent.text);
    }

    console.log('─'.repeat(50));
    console.log('\n✅ API Key está VÁLIDA e funcional!');
    console.log('✅ Modelo Sonnet 4.5 está ACESSÍVEL!');
    console.log('\nVocê pode fazer upload de extratos agora. 🎉\n');

  } catch (error: any) {
    console.error('\n❌ ERRO ao testar API:\n');
    console.error('─'.repeat(50));

    if (error.status === 401) {
      console.error('🔒 Erro de Autenticação (401)');
      console.error('   A API Key é inválida ou foi revogada.');
      console.error('   → Gere uma nova key em: https://console.anthropic.com/settings/keys');
    } else if (error.status === 429) {
      console.error('⏱️  Rate Limit (429)');
      console.error('   Muitas requisições ou créditos insuficientes.');
      console.error('   → Verifique seu plano em: https://console.anthropic.com/settings/billing');
    } else if (error.status === 404) {
      console.error('🔍 Modelo não encontrado (404)');
      console.error('   O modelo', MODEL, 'não está disponível para sua conta.');
      console.error('   → Verifique modelos disponíveis ou aguarde rollout.');
    } else if (error.code === 'ENOTFOUND' || error.code === 'UND_ERR_SOCKET') {
      console.error('🌐 Erro de Conexão');
      console.error('   Não foi possível conectar à api.anthropic.com');
      console.error('   → Verifique sua conexão de internet');
      console.error('   → Verifique se há firewall/proxy bloqueando');
    } else {
      console.error('Erro desconhecido:');
      console.error(error);
    }

    console.error('─'.repeat(50));
    console.error('\n❌ Corrija o problema acima antes de fazer upload.\n');
    process.exit(1);
  }
}

testAPI();
