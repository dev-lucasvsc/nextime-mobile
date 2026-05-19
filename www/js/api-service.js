/**
 * api-service.js — Nextime v2
 * Disciplina: Desenvolvimento Mobile — Unieuro 2025
 *
 * Centraliza todas as chamadas a APIs públicas externas.
 * Cada função retorna uma Promise e implementa async/await com tratamento de erro.
 *
 * APIs integradas:
 *  1. IBGE — Municípios (dados.gov.br / obrigatória)
 *  2. ViaCEP — Endereço por CEP (brasileira)
 *  3. ReceitaWS — Dados de empresa por CNPJ (brasileira / Receita Federal)
 *  4. BrasilAPI — Feriados nacionais (brasileira)
 *  5. DiceBear — Avatar gerado por nome (internacional)
 */

// ─────────────────────────────────────────────────────────────
// CONSTANTES DE ENDPOINTS
// ─────────────────────────────────────────────────────────────
const API_URLS = {
  ibge:       'https://servicodados.ibge.gov.br/api/v1/localidades/municipios',
  viacep:     'https://viacep.com.br/ws',
  receitaws:  'https://receitaws.com.br/v1/cnpj',
  brasilapi:  'https://brasilapi.com.br/api/feriados/v1',
  brasilapiCnpj: 'https://brasilapi.com.br/api/cnpj/v1',
  dicebear:   'https://api.dicebear.com/9.x/initials/svg',
};

// ─────────────────────────────────────────────────────────────
// CACHE LOCAL (localStorage)
// ─────────────────────────────────────────────────────────────
const ApiCache = {
  _key: (ns, id) => `nx2_cache_${ns}_${id}`,

  get(ns, id) {
    try {
      const raw = localStorage.getItem(this._key(ns, id));
      if (!raw) return null;
      const { data, ts } = JSON.parse(raw);
      // Cache válido por 24h
      if (Date.now() - ts > 86400000) { this.del(ns, id); return null; }
      return data;
    } catch { return null; }
  },

  set(ns, id, data) {
    try {
      localStorage.setItem(this._key(ns, id), JSON.stringify({ data, ts: Date.now() }));
    } catch(e) { console.warn('Cache write error:', e); }
  },

  del(ns, id) {
    localStorage.removeItem(this._key(ns, id));
  }
};

// ─────────────────────────────────────────────────────────────
// API 1 — IBGE Municípios (dados.gov.br — OBRIGATÓRIA)
// Fonte: https://servicodados.ibge.gov.br/api/docs/localidades
// Sem autenticação. Dados oficiais do governo federal.
// ─────────────────────────────────────────────────────────────
const ApiIBGE = {

  /**
   * Busca dados completos de um município pelo código IBGE.
   * O código é retornado automaticamente pelo ViaCEP no campo "ibge".
   * @param {string} codigoIbge — ex: "5200050"
   * @returns {{ nome, uf, microrregiao, mesorregiao }} ou null
   */
  async buscarMunicipio(codigoIbge) {
    if (!codigoIbge) return null;

    // Verificar cache
    const cached = ApiCache.get('ibge_municipio', codigoIbge);
    if (cached) { console.log('[IBGE] Cache hit:', codigoIbge); return cached; }

    try {
      console.log('[IBGE] Buscando município:', codigoIbge);
      const res  = await fetch(`${API_URLS.ibge}/${codigoIbge}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const resultado = {
        nome:        data.nome,
        uf:          data.microrregiao?.mesorregiao?.UF?.sigla || '',
        microrregiao: data.microrregiao?.nome || '',
        mesorregiao:  data.microrregiao?.mesorregiao?.nome || '',
      };

      ApiCache.set('ibge_municipio', codigoIbge, resultado);
      console.log('[IBGE] Município:', resultado);
      return resultado;
    } catch(e) {
      console.error('[IBGE] Erro:', e.message);
      return null;
    }
  },

  /**
   * Busca todos os municípios de um estado (UF).
   * @param {string} uf — ex: "GO"
   */
  async listarMunicipiosPorUF(uf) {
    if (!uf) return [];
    const cached = ApiCache.get('ibge_uf', uf);
    if (cached) return cached;

    try {
      const res  = await fetch(`${API_URLS.ibge}?orderBy=nome`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const todos = await res.json();
      const filtrados = todos
        .filter(m => m.microrregiao?.mesorregiao?.UF?.sigla === uf)
        .map(m => ({ id: m.id, nome: m.nome }));
      ApiCache.set('ibge_uf', uf, filtrados);
      return filtrados;
    } catch(e) {
      console.error('[IBGE] Erro ao listar municípios:', e.message);
      return [];
    }
  }
};

// ─────────────────────────────────────────────────────────────
// API 2 — ViaCEP (brasileira)
// Fonte: https://viacep.com.br
// Sem autenticação. Dados dos Correios.
// ─────────────────────────────────────────────────────────────
const ApiViaCEP = {

  /**
   * Busca endereço pelo CEP e enriquece com dados do IBGE.
   * @param {string} cep — 8 dígitos numéricos
   * @returns {{ logradouro, bairro, localidade, uf, ibge, microrregiao }} ou null
   */
  async buscarCEP(cep) {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) throw new Error('CEP deve ter 8 dígitos.');

    const cached = ApiCache.get('viacep', cepLimpo);
    if (cached) { console.log('[ViaCEP] Cache hit:', cepLimpo); return cached; }

    try {
      console.log('[ViaCEP] Buscando CEP:', cepLimpo);
      const res  = await fetch(`${API_URLS.viacep}/${cepLimpo}/json/`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.erro) throw new Error('CEP não encontrado.');

      // Enriquecer com IBGE
      let microrregiao = '';
      if (data.ibge) {
        const ibge = await ApiIBGE.buscarMunicipio(data.ibge);
        if (ibge) microrregiao = ibge.microrregiao;
      }

      const resultado = {
        logradouro:  data.logradouro  || '',
        bairro:      data.bairro      || '',
        localidade:  data.localidade  || '',
        uf:          data.uf          || '',
        ibge:        data.ibge        || '',
        microrregiao,
      };

      ApiCache.set('viacep', cepLimpo, resultado);
      console.log('[ViaCEP] Resultado:', resultado);
      return resultado;
    } catch(e) {
      console.error('[ViaCEP] Erro:', e.message);
      throw e;
    }
  }
};

// ─────────────────────────────────────────────────────────────
// API 3 — BrasilAPI CNPJ — Dados da Receita Federal (sem CORS)
// Fonte: https://brasilapi.com.br/docs#tag/CNPJ
// Sem autenticação. Suporta CORS para apps mobile/browser.
// ─────────────────────────────────────────────────────────────
const ApiReceitaWS = {

  /**
   * Valida CNPJ e retorna dados cadastrais da Receita Federal via BrasilAPI.
   * @param {string} cnpj — 14 dígitos numéricos
   * @returns {{ razaoSocial, fantasia, situacao, uf, municipio, abertura }} ou null
   */
  async consultarCNPJ(cnpj) {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) throw new Error('CNPJ deve ter 14 dígitos.');

    const cached = ApiCache.get('brasilapi_cnpj', cnpjLimpo);
    if (cached) { console.log('[BrasilAPI/CNPJ] Cache hit:', cnpjLimpo); return cached; }

    try {
      console.log('[BrasilAPI/CNPJ] Consultando CNPJ:', cnpjLimpo);
      const res  = await fetch(`${API_URLS.brasilapiCnpj}/${cnpjLimpo}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Erro HTTP ${res.status}`);
      }
      const data = await res.json();

      const situacao = (data.descricao_situacao_cadastral || '').toUpperCase();
      if (situacao && situacao !== 'ATIVA') {
        throw new Error(`CNPJ com situação: ${situacao}. Apenas CNPJs ativos são aceitos.`);
      }

      const resultado = {
        razaoSocial: data.razao_social                || '',
        fantasia:    data.nome_fantasia               || data.razao_social || '',
        situacao:    situacao                         || 'ATIVA',
        uf:          data.uf                          || '',
        municipio:   data.municipio                   || '',
        abertura:    data.data_inicio_atividade        || '',
      };

      ApiCache.set('brasilapi_cnpj', cnpjLimpo, resultado);
      console.log('[BrasilAPI/CNPJ] Resultado:', resultado);
      return resultado;
    } catch(e) {
      console.error('[BrasilAPI/CNPJ] Erro:', e.message);
      throw e;
    }
  }
};

// ─────────────────────────────────────────────────────────────
// API 4 — BrasilAPI Feriados (brasileira)
// Fonte: https://brasilapi.com.br
// Sem autenticação.
// ─────────────────────────────────────────────────────────────
const ApiBrasilAPI = {

  /**
   * Retorna todos os feriados nacionais de um ano.
   * @param {number} ano
   * @returns {Object} mapa { "YYYY-MM-DD": "Nome do Feriado" }
   */
  async buscarFeriados(ano) {
    const cached = ApiCache.get('feriados', ano);
    if (cached) { console.log('[BrasilAPI] Cache hit feriados:', ano); return cached; }

    try {
      console.log('[BrasilAPI] Buscando feriados:', ano);
      const res  = await fetch(`${API_URLS.brasilapi}/${ano}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Converter array em mapa de data → nome
      const mapa = data.reduce((acc, f) => {
        acc[f.date] = f.name;
        return acc;
      }, {});

      ApiCache.set('feriados', ano, mapa);
      console.log('[BrasilAPI] Feriados carregados:', Object.keys(mapa).length);
      return mapa;
    } catch(e) {
      console.error('[BrasilAPI] Erro:', e.message);
      return {};
    }
  }
};

// ─────────────────────────────────────────────────────────────
// API 5 — DiceBear Avatars (internacional)
// Fonte: https://api.dicebear.com
// Sem autenticação. Retorna SVG inline via URL.
// ─────────────────────────────────────────────────────────────
const ApiDiceBear = {

  /**
   * Gera URL de avatar com as iniciais do nome.
   * Não requer fetch — a URL é usada diretamente como src de <img>.
   * @param {string} nome
   * @returns {string} URL do SVG
   */
  avatarUrl(nome) {
    const seed = encodeURIComponent(nome || 'U');
    return `${API_URLS.dicebear}?seed=${seed}&backgroundColor=0d3d2e,1a5c44,0a2e20&fontFamily=Arial&fontSize=38&bold=true`;
  }
};