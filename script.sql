-- =========================================================================================
-- SISTEMA DE TABELA DE VIDA ECOLÓGICA & ANÁLISE DE FATOR-CHAVE (UniRV — Rio Verde, GO)
-- Metodologia: Varley & Gradwell (1960), Podoler & Rogers (1975), Pereira et al. (2018)
-- Banco de Dados: PostgreSQL 14+
-- Arquivo: script.sql (DDL de Criação de Tabelas, Índices, Views e DML de Carga Inicial)
-- =========================================================================================

BEGIN;

-- Limpeza segura das tabelas existentes (ordem reversa de dependência)
DROP VIEW IF EXISTS vw_soma_fases_por_talhao CASCADE;
DROP VIEW IF EXISTS vw_resumo_cenarios CASCADE;

DROP TABLE IF EXISTS contagens_fase CASCADE;
DROP TABLE IF EXISTS amostras_coleta CASCADE;
DROP TABLE IF EXISTS talhoes CASCADE;
DROP TABLE IF EXISTS cenario_fases CASCADE;
DROP TABLE IF EXISTS cenarios_analiticos CASCADE;
DROP TABLE IF EXISTS pragas CASCADE;
DROP TABLE IF EXISTS culturas CASCADE;
DROP TABLE IF EXISTS areas_experimentais CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- =========================================================================================
-- 1. TABELA DE USUÁRIOS / AGRÔNOMOS RESPONSÁVEIS
-- =========================================================================================
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    crea_registro VARCHAR(50),
    instituicao VARCHAR(150) NOT NULL DEFAULT 'Universidade de Rio Verde (UniRV)',
    cargo VARCHAR(100) NOT NULL DEFAULT 'Engenheiro Agrônomo / Pesquisador',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================================
-- 2. TABELA DE ÁREAS EXPERIMENTAIS (UniRV — RIO VERDE / GO)
-- =========================================================================================
CREATE TABLE areas_experimentais (
    id VARCHAR(50) PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    nome_curto VARCHAR(100) NOT NULL,
    descricao TEXT NOT NULL,
    dms_lat VARCHAR(40) NOT NULL,
    dms_lng VARCHAR(40) NOT NULL,
    latitude NUMERIC(10, 6) NOT NULL,
    longitude NUMERIC(10, 6) NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================================
-- 3. TABELA DE CULTURAS AGRÍCOLAS
-- =========================================================================================
CREATE TABLE culturas (
    id VARCHAR(50) PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    nome_cientifico VARCHAR(120) NOT NULL,
    familia VARCHAR(80) NOT NULL,
    descricao TEXT NOT NULL,
    imagem VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================================
-- 4. TABELA DE PRAGAS ENTOMOLÓGICAS POR CULTURA
-- =========================================================================================
CREATE TABLE pragas (
    id VARCHAR(80) PRIMARY KEY,
    cultura_id VARCHAR(50) NOT NULL REFERENCES culturas(id) ON DELETE CASCADE,
    nome_comum VARCHAR(120) NOT NULL,
    nome_cientifico VARCHAR(140) NOT NULL,
    ordem VARCHAR(100),
    fase_critica_tipica VARCHAR(60),
    descricao TEXT NOT NULL,
    imagem VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pragas_cultura_id ON pragas(cultura_id);

-- =========================================================================================
-- 5. TABELA DE CENÁRIOS ANALÍTICOS (MARCHAS ANALÍTICAS DOS AGRÔNOMOS)
-- =========================================================================================
CREATE TABLE cenarios_analiticos (
    id VARCHAR(60) PRIMARY KEY,
    nome VARCHAR(220) NOT NULL,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    usuario_nome VARCHAR(150) NOT NULL,
    cultura_id VARCHAR(50) NOT NULL REFERENCES culturas(id) ON DELETE RESTRICT,
    praga_id VARCHAR(80) NOT NULL REFERENCES pragas(id) ON DELETE RESTRICT,
    area_experimental_id VARCHAR(50) REFERENCES areas_experimentais(id) ON DELETE SET NULL,
    num_talhoes INTEGER NOT NULL DEFAULT 10 CHECK (num_talhoes >= 2 AND num_talhoes <= 100),
    num_amostras_por_talhao INTEGER NOT NULL DEFAULT 10 CHECK (num_amostras_por_talhao >= 1 AND num_amostras_por_talhao <= 100),
    observacoes TEXT,
    ativo BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cenarios_cultura_praga ON cenarios_analiticos(cultura_id, praga_id);

-- =========================================================================================
-- 6. TABELA DE FASES DE DESENVOLVIMENTO DO CENÁRIO (Ov, N1..Nn, Ad)
-- =========================================================================================
CREATE TABLE cenario_fases (
    id SERIAL PRIMARY KEY,
    cenario_id VARCHAR(60) NOT NULL REFERENCES cenarios_analiticos(id) ON DELETE CASCADE,
    codigo_fase VARCHAR(20) NOT NULL,
    label VARCHAR(60) NOT NULL,
    ordem INTEGER NOT NULL,
    is_initial BOOLEAN NOT NULL DEFAULT FALSE,
    is_terminal BOOLEAN NOT NULL DEFAULT FALSE,
    is_nymph BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (cenario_id, codigo_fase)
);

CREATE INDEX idx_cenario_fases_cenario ON cenario_fases(cenario_id, ordem);

-- =========================================================================================
-- 7. TABELA DE TALHÕES MONITORADOS POR CENÁRIO
-- =========================================================================================
CREATE TABLE talhoes (
    id SERIAL PRIMARY KEY,
    cenario_id VARCHAR(60) NOT NULL REFERENCES cenarios_analiticos(id) ON DELETE CASCADE,
    numero_talhao INTEGER NOT NULL,
    nome VARCHAR(100) NOT NULL,
    area_experimental_id VARCHAR(50) REFERENCES areas_experimentais(id) ON DELETE SET NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (cenario_id, numero_talhao)
);

CREATE INDEX idx_talhoes_cenario ON talhoes(cenario_id, numero_talhao);

-- =========================================================================================
-- 8. TABELA DE AMOSTRAS GEORREFERENCIADAS POR TALHÃO
-- =========================================================================================
CREATE TABLE amostras_coleta (
    id SERIAL PRIMARY KEY,
    talhao_id INTEGER NOT NULL REFERENCES talhoes(id) ON DELETE CASCADE,
    indice_amostra INTEGER NOT NULL CHECK (indice_amostra >= 0),
    latitude NUMERIC(10, 6) NOT NULL,
    longitude NUMERIC(10, 6) NOT NULL,
    data_hora_coleta VARCHAR(40) NOT NULL DEFAULT '2026-11-10 08:30',
    observacao VARCHAR(255),
    UNIQUE (talhao_id, indice_amostra)
);

CREATE INDEX idx_amostras_talhao ON amostras_coleta(talhao_id, indice_amostra);

-- =========================================================================================
-- 9. TABELA DE CONTAGENS OBSERVADAS POR FASE E AMOSTRA
-- =========================================================================================
CREATE TABLE contagens_fase (
    id SERIAL PRIMARY KEY,
    talhao_id INTEGER NOT NULL REFERENCES talhoes(id) ON DELETE CASCADE,
    indice_amostra INTEGER NOT NULL CHECK (indice_amostra >= 0),
    codigo_fase VARCHAR(20) NOT NULL,
    quantidade NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
    UNIQUE (talhao_id, indice_amostra, codigo_fase)
);

CREATE INDEX idx_contagens_talhao_fase ON contagens_fase(talhao_id, codigo_fase, indice_amostra);

-- =========================================================================================
-- CARGA DE DADOS INICIAIS (DML - INSERT INTO)
-- =========================================================================================

-- 1. Inserindo Usuários / Pesquisadores
INSERT INTO usuarios (id, nome, email, crea_registro, instituicao, cargo, criado_em) VALUES
(1, 'Eng. Agr. Dr. Sérgio', 'sergio.agronomia@unirv.edu.br', 'CREA-GO 102938/D', 'Universidade de Rio Verde (UniRV)', 'Pesquisador Coordenador MIP', '2026-11-01 08:00:00'),
(2, 'Equipe MIP — Agronomia UniRV', 'mip.agronomia@unirv.edu.br', 'CREA-GO 204819/D', 'Universidade de Rio Verde (UniRV)', 'Equipe Técnica de Monitoramento', '2026-11-02 09:00:00'),
(3, 'Lab. Entomologia Agrícola — PPGPV UniRV', 'entomologia.ppgpv@unirv.edu.br', 'CREA-GO 309182/D', 'Programa de Pós-Graduação em Produção Vegetal — UniRV', 'Laboratório de Pesquisa Entomológica', '2026-11-03 10:00:00');

SELECT setval('usuarios_id_seq', 3, true);

-- 2. Inserindo Áreas Experimentais da UniRV em Rio Verde - GO
INSERT INTO areas_experimentais (id, nome, nome_curto, descricao, dms_lat, dms_lng, latitude, longitude) VALUES
('fontes-do-saber', 'Campus Sede / Fazenda Fontes do Saber (Estação INMET/UniRV)', 'Faz. Fontes do Saber (Campus I)', 'Referência central das áreas de pesquisa e agronomia dentro da fazenda experimental principal do Campus I da UniRV em Rio Verde - GO.', '17° 47'' 07" S', '50° 57'' 53" O', -17.785303, -50.964869),
('ctc-comigo', 'Área Experimental de Culturas Alternativas / Parcerias (CTC Comigo)', 'Área Culturas Alternativas (CTC)', 'Área experimental voltada para ensaios de culturas alternativas e parcerias tecnológicas nos arredores de Rio Verde - GO.', '17° 45'' 59,20" S', '51° 02'' 15,01" O', -17.766444, -51.037503),
('area-1-pos', 'Área de Ensaios a Campo 1 (Pós-Graduação UniRV)', 'Ensaios a Campo — Área 1', 'Área experimental registrada em dissertações e teses do Programa de Pós-Graduação em Produção Vegetal da UniRV.', '17° 46'' 01,10" S', '51° 02'' 18,40" O', -17.766972, -51.038444),
('area-2-pos', 'Área de Ensaios a Campo 2 (Pós-Graduação UniRV)', 'Ensaios a Campo — Área 2', 'Segunda estação de ensaios fitotécnicos e entomológicos a campo registrada pelo Programa de Pós-Graduação da UniRV.', '17° 47'' 02,41" S', '51° 00'' 27,28" O', -17.784003, -51.007578);

-- 3. Inserindo Culturas Agrícolas
INSERT INTO culturas (id, nome, nome_cientifico, familia, descricao, imagem) VALUES
('soja', 'Soja', 'Glycine max', 'Fabaceae', 'Principal oleaginosa do agronegócio, suscetível a desfolhadores e percevejos sugadores de vagens.', 'assets/culturas/soja.jpg'),
('milho', 'Milho', 'Zea mays', 'Poaceae', 'Gramínea de ciclo estival e safrinha, com alta demanda nutricional e vulnerabilidade no cartucho.', 'assets/culturas/milho.jpg'),
('cana-de-acucar', 'Cana-de-açúcar', 'Saccharum officinarum', 'Poaceae', 'Cultura semiperene bioenergética de biomassa, açúcar e etanol com ciclo plurianual.', 'assets/culturas/cana-de-acucar.jpg'),
('sorgo', 'Sorgo', 'Sorghum bicolor', 'Poaceae', 'Cultura rústica tolerante ao estresse hídrico, essencial para alimentação animal e bioenergia.', 'assets/culturas/sorgo.jpg'),
('algodao', 'Algodão', 'Gossypium hirsutum', 'Malvaceae', 'Fibra vegetal têxtil de alto valor agregado com complexo fenológico e botões florais sensíveis.', 'assets/culturas/algodao.jpg'),
('feijao', 'Feijão', 'Phaseolus vulgaris', 'Fabaceae', 'Leguminosa alimentícia básica de ciclo curto, altamente suscetível a insetos vetores.', 'assets/culturas/feijao.jpg'),
('arroz', 'Arroz', 'Oryza sativa', 'Poaceae', 'Cereal de base mundial cultivado em terras altas e várzeas inundadas.', 'assets/culturas/arroz.jpg'),
('trigo', 'Trigo', 'Triticum aestivum', 'Poaceae', 'Cereal de inverno base para panificação, sensível a pulgões transmissores de vírus.', 'assets/culturas/trigo.jpg');

-- 4. Inserindo Pragas Entomológicas Catalogadas
INSERT INTO pragas (id, cultura_id, nome_comum, nome_cientifico, ordem, fase_critica_tipica, descricao, imagem) VALUES
-- Soja
('anticarsia-gemmatalis', 'soja', 'Lagarta-da-soja', 'Anticarsia gemmatalis', 'Lepidoptera: Erebidae', 'N3 / N4', 'Principal desfolhador histórico da soja, com listras brancas dorsais longitudinais.', 'assets/pragas/anticarsia-gemmatalis.jpg'),
('chrysodeixis-includens', 'soja', 'Lagarta-falsa-medideira', 'Chrysodeixis includens', 'Lepidoptera: Noctuidae', 'N3 / N4', 'Locomoção característica tipo mede-palmo, desfolha rendilhada poupando nervuras.', 'assets/pragas/chrysodeixis-includens.jpg'),
('euschistus-heros', 'soja', 'Percevejo-marrom', 'Euschistus heros', 'Hemiptera: Pentatomidae', 'Ovo / N3', 'Percevejo de maior expressão econômica, suga vagens e grãos em desenvolvimento.', 'assets/pragas/euschistus-heros.jpg'),
('spodoptera-cosmioides', 'soja', 'Lagarta-das-vagens', 'Spodoptera cosmioides', 'Lepidoptera: Noctuidae', 'N3 / N4', 'Corpo escuro com pontos alaranjados, ataca diretamente flores e vagens formadas.', 'assets/pragas/spodoptera-cosmioides.jpg'),
-- Milho
('spodoptera-frugiperda', 'milho', 'Lagarta-do-cartucho', 'Spodoptera frugiperda', 'Lepidoptera: Noctuidae', 'N3', 'Praga-chave do milho, identificada pelo "Y" invertido na cápsula cefálica.', 'assets/pragas/spodoptera-frugiperda.jpg'),
('dalbulus-maidis', 'milho', 'Cigarrinha-do-milho', 'Dalbulus maidis', 'Hemiptera: Cicadellidae', 'Ninfa / Adulto', 'Vetor do complexo de enfezamentos pálido, vermelho e vírus do raiado fino.', 'assets/pragas/dalbulus-maidis.jpg'),
('helicoverpa-zea', 'milho', 'Lagarta-da-espiga', 'Helicoverpa zea', 'Lepidoptera: Noctuidae', 'N2 / N3', 'Penetra no estilo-estigma da espiga e destrói grãos na ponta, facilitando podridões.', 'assets/pragas/helicoverpa-zea.jpg'),
('dichelops-melacanthus', 'milho', 'Percevejo-barriga-verde', 'Dichelops melacanthus', 'Hemiptera: Pentatomidae', 'Ninfa / Adulto', 'Ataca plântulas em emergência, provocando enfezamento e perfilhamento excessivo.', 'assets/pragas/dichelops-melacanthus.jpg'),
-- Cana-de-açúcar
('diatraea-saccharalis', 'cana-de-acucar', 'Broca-da-cana', 'Diatraea saccharalis', 'Lepidoptera: Crambidae', 'Ovo / N1', 'Abre galerias nos colmos internos, causando quebra e podridão vermelha por fungos.', 'assets/pragas/diatraea-saccharalis.jpg'),
('mahanarva-fimbriolata', 'cana-de-acucar', 'Cigarrinha-das-raízes', 'Mahanarva fimbriolata', 'Hemiptera: Cercopidae', 'Ninfa em espuma', 'Ninfas produzem massa de espuma na base do colmo e adultos injetam toxinas nas folhas.', 'assets/pragas/mahanarva-fimbriolata.jpg'),
('sphenophorus-levis', 'cana-de-acucar', 'Bicudo-da-cana', 'Sphenophorus levis', 'Coleoptera: Curculionidae', 'Larva', 'Gorgulho subterrâneo cujas larvas abrem galerias no rizoma, dizimando a soqueira.', 'assets/pragas/sphenophorus-levis.jpg'),
-- Sorgo
('spodoptera-frugiperda-sorgo', 'sorgo', 'Lagarta-do-cartucho', 'Spodoptera frugiperda', 'Lepidoptera: Noctuidae', 'N3', 'Alimenta-se do cartucho provocando perfurações e destruição foliar na fase vegetativa.', 'assets/pragas/spodoptera-frugiperda.jpg'),
('melanaphis-sorghi', 'sorgo', 'Pulgão-do-sorgo', 'Melanaphis sorghi', 'Hemiptera: Aphididae', 'Ninfa / Adulto', 'Forma colônias massivas sob as folhas, expelindo melaço e fumagina com desidratação.', 'assets/pragas/melanaphis-sorghi.jpg'),
('stenodiplosis-sorghicola', 'sorgo', 'Mosca-do-sorgo', 'Stenodiplosis sorghicola', 'Diptera: Cecidomyiidae', 'Larva / Flor', 'Deposita ovos nas espiguetas em floração; a larva suga o ovário impedindo o grão.', 'assets/pragas/stenodiplosis-sorghicola.jpg'),
-- Algodão
('anthonomus-grandis', 'algodao', 'Bicudo-do-algodoeiro', 'Anthonomus grandis', 'Coleoptera: Curculionidae', 'Ovo / Larva', 'Praga quarentenária e chave; ovoposita nos botões florais provocando sua queda.', 'assets/pragas/anthonomus-grandis.jpg'),
('helicoverpa-armigera', 'algodao', 'Lagarta-das-maçãs', 'Helicoverpa armigera', 'Lepidoptera: Noctuidae', 'N2 / N3', 'Altamente polífaga e voraz, perfura botões florais e maçãs verdes de algodão.', 'assets/pragas/helicoverpa-armigera.jpg'),
('alabama-argillacea', 'algodao', 'Curuquerê-do-algodoeiro', 'Alabama argillacea', 'Lepidoptera: Erebidae', 'N3 / N4', 'Desfolhador rápido com capacidade de destruir o dossel foliar do algodoeiro.', 'assets/pragas/alabama-argillacea.jpg'),
('bemisia-tabaci-algodao', 'algodao', 'Mosca-branca', 'Bemisia tabaci', 'Hemiptera: Aleyrodidae', 'Ninfa', 'Suga seiva, expele melaço caramelizando a fibra do algodão e transmitindo vírus.', 'assets/pragas/bemisia-tabaci.jpg'),
-- Feijão
('bemisia-tabaci', 'feijao', 'Mosca-branca', 'Bemisia tabaci', 'Hemiptera: Aleyrodidae', 'Ninfa / Adulto', 'Vetor primário do mosaico dourado do feijoeiro (BGMV), capaz de abortar 100% da safra.', 'assets/pragas/bemisia-tabaci.jpg'),
('diabrotica-speciosa', 'feijao', 'Vaquinha', 'Diabrotica speciosa', 'Coleoptera: Chrysomelidae', 'Adulto / Larva', 'Adultos furam folhas tenras e brotos; larvas (larva-alfinete) atacam raízes.', 'assets/pragas/diabrotica-speciosa.jpg'),
('empoasca-kraemeri', 'feijao', 'Cigarrinha-verde', 'Empoasca kraemeri', 'Hemiptera: Cicadellidae', 'Ninfa / Adulto', 'Injeta toxinas que provocam engruvinhamento foliar, amarelecimento e queima das bordas.', 'assets/pragas/empoasca-kraemeri.jpg'),
('frankliniella-schultzei', 'feijao', 'Tripes', 'Frankliniella schultzei', 'Thysanoptera: Thripidae', 'Ninfa / Flor', 'Raspa folhas e pétalas florais, provocando prateamento e queda precoce de flores.', 'assets/pragas/frankliniella-schultzei.jpg'),
-- Arroz
('oryzophagus-oryzae', 'arroz', 'Bicheira-da-raiz', 'Oryzophagus oryzae', 'Coleoptera: Curculionidae', 'Larva aquática', 'Larvas aquáticas podam o sistema radicular em áreas irrigadas por inundação.', 'assets/pragas/oryzophagus-oryzae.jpg'),
('tibraca-limbativentris', 'arroz', 'Percevejo-do-colmo', 'Tibraca limbativentris', 'Hemiptera: Pentatomidae', 'Ninfa / Adulto', 'Punctura a base do colmo gerando coração morto em plântulas e panícula branca.', 'assets/pragas/tibraca-limbativentris.jpg'),
('spodoptera-frugiperda-arroz', 'arroz', 'Lagarta-da-folha', 'Spodoptera frugiperda', 'Lepidoptera: Noctuidae', 'N2 / N3', 'Desfolha vigorosa antes da entrada definitiva da lâmina de água.', 'assets/pragas/spodoptera-frugiperda.jpg'),
('rhopalosiphum-rufiabdominale', 'arroz', 'Pulgão-do-arroz', 'Rhopalosiphum rufiabdominale', 'Hemiptera: Aphididae', 'Ninfa / Colo', 'Fixa-se no colo da planta e raízes superficiais, debilitando o perfilhamento.', 'assets/pragas/rhopalosiphum-rufiabdominale.jpg'),
-- Trigo
('rhopalosiphum-padi', 'trigo', 'Pulgão-verde-dos-cereais', 'Rhopalosiphum padi', 'Hemiptera: Aphididae', 'Ninfa / Folha', 'Principal vetor do vírus do nanismo amarelo da cevada (BYDV) no início do perfilhamento.', 'assets/pragas/rhopalosiphum-padi.jpg'),
('sitobion-avenae', 'trigo', 'Pulgão-da-espiga', 'Sitobion avenae', 'Hemiptera: Aphididae', 'Ninfa / Espiga', 'Coloniza diretamente a espiga entre as aristas durante o enchimento de grãos.', 'assets/pragas/sitobion-avenae.jpg'),
('schizaphis-graminum', 'trigo', 'Pulgão-do-colmo', 'Schizaphis graminum', 'Hemiptera: Aphididae', 'Ninfa / Colmo', 'Injeta saliva fitotóxica que causa manchas cloróticas e necrose acelerada dos tecidos.', 'assets/pragas/schizaphis-graminum.jpg'),
('pseudaletia-sequax', 'trigo', 'Lagarta-do-trigo', 'Pseudaletia sequax', 'Lepidoptera: Noctuidae', 'N3 / N4', 'Hábito noturno; corta folhas e pedúnculos das espigas, derrubando-as no solo.', 'assets/pragas/pseudaletia-sequax.jpg');

-- =========================================================================================
-- 5. INSERINDO OS 3 CENÁRIOS ANALÍTICOS PRINCIPAIS
-- =========================================================================================
INSERT INTO cenarios_analiticos (
    id, nome, usuario_id, usuario_nome, cultura_id, praga_id, area_experimental_id,
    num_talhoes, num_amostras_por_talhao, observacoes, ativo, criado_em, atualizado_em
) VALUES
(
    'cen-unirv-01',
    'Monitoramento Safra 2026/27 — Fazenda Fontes do Saber (UniRV)',
    1,
    'Eng. Agr. Dr. Sérgio',
    'soja',
    'euschistus-heros',
    'fontes-do-saber',
    10,
    10,
    'Marcha analítica principal da planilha experimental (10 talhões × 10 amostras) conduzida nas quadras da Fazenda Fontes do Saber — Campus I UniRV (Rio Verde - GO).',
    TRUE,
    '2026-11-10 08:30:00',
    '2026-11-10 17:45:00'
),
(
    'cen-unirv-02',
    'Ensaio Safrinha Milho — Área Experimental CTC / UniRV',
    2,
    'Equipe MIP — Agronomia UniRV',
    'milho',
    'spodoptera-frugiperda',
    'ctc-comigo',
    6,
    8,
    'Avaliação de mortalidade natural e predação larval no cartucho do milho (V4–V8) na Área Experimental de Culturas Alternativas / Parceria CTC Comigo.',
    FALSE,
    '2026-11-09 14:15:00',
    '2026-11-09 16:40:00'
),
(
    'cen-unirv-03',
    'Dinâmica Populacional em Algodoeiro — Pós-Graduação Área 1',
    3,
    'Lab. Entomologia Agrícola — PPGPV UniRV',
    'algodao',
    'anthonomus-grandis',
    'area-1-pos',
    5,
    12,
    'Marcha analítica de botões florais atacados e sobrevivência pré-imaginal nos talhões experimentais de Pós-Graduação (Área 1 — UniRV).',
    FALSE,
    '2026-11-08 10:20:00',
    '2026-11-08 15:10:00'
);

-- =========================================================================================
-- 6. INSERINDO AS FASES DE DESENVOLVIMENTO DOS CENÁRIOS (Ov, N1, N2, N3, N4, Ad)
-- =========================================================================================
INSERT INTO cenario_fases (cenario_id, codigo_fase, label, ordem, is_initial, is_terminal, is_nymph)
SELECT c.id, f.codigo_fase, f.label, f.ordem, f.is_initial, f.is_terminal, f.is_nymph
FROM cenarios_analiticos c
CROSS JOIN (
    VALUES
        ('Ov', 'Ovo (Ov)', 1, TRUE, FALSE, FALSE),
        ('N1', 'Ninfa 1 (N1)', 2, FALSE, FALSE, TRUE),
        ('N2', 'Ninfa 2 (N2)', 3, FALSE, FALSE, TRUE),
        ('N3', 'Ninfa 3 (N3)', 4, FALSE, FALSE, TRUE),
        ('N4', 'Ninfa 4 (N4)', 5, FALSE, FALSE, TRUE),
        ('Ad', 'Adulto (Ad)', 6, FALSE, TRUE, FALSE)
) AS f(codigo_fase, label, ordem, is_initial, is_terminal, is_nymph);

-- =========================================================================================
-- 7. INSERINDO OS TALHÕES DO CENÁRIO 1 (cen-unirv-01: 10 Talhões na UniRV)
-- =========================================================================================
INSERT INTO talhoes (id, cenario_id, numero_talhao, nome, area_experimental_id) VALUES
(1,  'cen-unirv-01', 1,  'Talhão 1',  'fontes-do-saber'),
(2,  'cen-unirv-01', 2,  'Talhão 2',  'fontes-do-saber'),
(3,  'cen-unirv-01', 3,  'Talhão 3',  'fontes-do-saber'),
(4,  'cen-unirv-01', 4,  'Talhão 4',  'fontes-do-saber'),
(5,  'cen-unirv-01', 5,  'Talhão 5',  'area-2-pos'),
(6,  'cen-unirv-01', 6,  'Talhão 6',  'area-2-pos'),
(7,  'cen-unirv-01', 7,  'Talhão 7',  'ctc-comigo'),
(8,  'cen-unirv-01', 8,  'Talhão 8',  'ctc-comigo'),
(9,  'cen-unirv-01', 9,  'Talhão 9',  'area-1-pos'),
(10, 'cen-unirv-01', 10, 'Talhão 10', 'area-1-pos'),
-- Talhões do Cenário 2 (cen-unirv-02: 6 Talhões na Área CTC Comigo)
(11, 'cen-unirv-02', 1,  'Talhão 1',  'ctc-comigo'),
(12, 'cen-unirv-02', 2,  'Talhão 2',  'ctc-comigo'),
(13, 'cen-unirv-02', 3,  'Talhão 3',  'ctc-comigo'),
(14, 'cen-unirv-02', 4,  'Talhão 4',  'ctc-comigo'),
(15, 'cen-unirv-02', 5,  'Talhão 5',  'ctc-comigo'),
(16, 'cen-unirv-02', 6,  'Talhão 6',  'ctc-comigo'),
-- Talhões do Cenário 3 (cen-unirv-03: 5 Talhões na Área 1 Pós-Graduação)
(17, 'cen-unirv-03', 1,  'Talhão 1',  'area-1-pos'),
(18, 'cen-unirv-03', 2,  'Talhão 2',  'area-1-pos'),
(19, 'cen-unirv-03', 3,  'Talhão 3',  'area-1-pos'),
(20, 'cen-unirv-03', 4,  'Talhão 4',  'area-1-pos'),
(21, 'cen-unirv-03', 5,  'Talhão 5',  'area-1-pos');

SELECT setval('talhoes_id_seq', 21, true);

-- =========================================================================================
-- 8. INSERINDO COORDENADAS GEORREFERENCIADAS DAS AMOSTRAS (amostras_coleta)
-- =========================================================================================
-- Gera pontos amostrais ao redor da coordenada central da área experimental de cada talhão
INSERT INTO amostras_coleta (talhao_id, indice_amostra, latitude, longitude, data_hora_coleta, observacao)
SELECT
    t.id AS talhao_id,
    gs.idx AS indice_amostra,
    ROUND((ae.latitude - (FLOOR(gs.idx / 5.0) * 0.00028) + ((gs.idx % 2) * 0.00005) - (t.numero_talhao * 0.00012))::numeric, 6) AS latitude,
    ROUND((ae.longitude + (((gs.idx % 5) - 2.0) * 0.00032) + ((t.numero_talhao % 3) * 0.00018))::numeric, 6) AS longitude,
    '2026-11-10 08:30' AS data_hora_coleta,
    ae.nome_curto || ' — ' || t.nome || ' — Amostra ' || (gs.idx + 1) AS observacao
FROM talhoes t
JOIN cenarios_analiticos c ON c.id = t.cenario_id
JOIN areas_experimentais ae ON ae.id = t.area_experimental_id
CROSS JOIN LATERAL generate_series(0, c.num_amostras_por_talhao - 1) AS gs(idx);

-- =========================================================================================
-- 9. INSERINDO AS CONTAGENS EXPERIMENTAIS REAIS DA PLANILHA (CENÁRIO 1: Talhões 1 a 10)
-- =========================================================================================

-- Talhão 1 (id = 1)
INSERT INTO contagens_fase (talhao_id, codigo_fase, indice_amostra, quantidade)
SELECT 1, fase, idx - 1, val FROM (
    VALUES
        ('Ov', ARRAY[9, 0, 8, 6, 5, 2, 5, 0, 0, 2]),
        ('N1', ARRAY[0, 0, 0, 0, 0, 3, 0, 0, 0, 0]),
        ('N2', ARRAY[0, 0, 2, 0, 0, 0, 1, 1, 0, 0]),
        ('N3', ARRAY[1, 0, 1, 0, 2, 1, 3, 8, 0, 5]),
        ('N4', ARRAY[0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
        ('Ad', ARRAY[4, 4, 4, 0, 4, 4, 4, 4, 4, 4])
) AS t(fase, arr) CROSS JOIN UNNEST(t.arr) WITH ORDINALITY AS u(val, idx);

-- Talhão 2 (id = 2)
INSERT INTO contagens_fase (talhao_id, codigo_fase, indice_amostra, quantidade)
SELECT 2, fase, idx - 1, val FROM (
    VALUES
        ('Ov', ARRAY[9, 0, 8, 6, 5, 2, 5, 0, 0, 2]),
        ('N1', ARRAY[0, 0, 0, 0, 0, 3, 0, 0, 0, 0]),
        ('N2', ARRAY[0, 0, 2, 0, 0, 0, 1, 1, 0, 0]),
        ('N3', ARRAY[1, 0, 1, 0, 2, 1, 3, 8, 0, 5]),
        ('N4', ARRAY[0, 0, 0, 0, 0, 2, 0, 0, 0, 1]),
        ('Ad', ARRAY[4, 4, 4, 0, 4, 4, 4, 4, 4, 4])
) AS t(fase, arr) CROSS JOIN UNNEST(t.arr) WITH ORDINALITY AS u(val, idx);

-- Talhão 3 (id = 3)
INSERT INTO contagens_fase (talhao_id, codigo_fase, indice_amostra, quantidade)
SELECT 3, fase, idx - 1, val FROM (
    VALUES
        ('Ov', ARRAY[1, 2, 4, 3, 7, 0, 10, 5, 0, 0]),
        ('N1', ARRAY[0, 0, 2, 2, 0, 0, 0, 0, 0, 0]),
        ('N2', ARRAY[0, 0, 0, 3, 0, 0, 0, 0, 0, 0]),
        ('N3', ARRAY[0, 0, 0, 1, 2, 0, 0, 1, 0, 0]),
        ('N4', ARRAY[0, 0, 0, 1, 1, 0, 1, 0, 1, 0]),
        ('Ad', ARRAY[5, 1, 7, 3, 9, 3, 4, 2, 2, 1])
) AS t(fase, arr) CROSS JOIN UNNEST(t.arr) WITH ORDINALITY AS u(val, idx);

-- Talhão 4 (id = 4)
INSERT INTO contagens_fase (talhao_id, codigo_fase, indice_amostra, quantidade)
SELECT 4, fase, idx - 1, val FROM (
    VALUES
        ('Ov', ARRAY[0, 7, 0, 0, 3, 16, 25, 12, 5, 0]),
        ('N1', ARRAY[2, 0, 0, 1, 0, 1, 6, 4, 7, 0]),
        ('N2', ARRAY[0, 0, 0, 0, 0, 0, 2, 5, 0, 0]),
        ('N3', ARRAY[0, 3, 0, 0, 0, 0, 0, 3, 0, 0]),
        ('N4', ARRAY[0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
        ('Ad', ARRAY[1, 2, 1, 1, 3, 2, 7, 14, 2, 1])
) AS t(fase, arr) CROSS JOIN UNNEST(t.arr) WITH ORDINALITY AS u(val, idx);

-- Talhão 5 (id = 5)
INSERT INTO contagens_fase (talhao_id, codigo_fase, indice_amostra, quantidade)
SELECT 5, fase, idx - 1, val FROM (
    VALUES
        ('Ov', ARRAY[0, 2, 2, 2, 0, 0, 5, 0, 2, 2]),
        ('N1', ARRAY[0, 0, 1, 0, 0, 0, 7, 0, 6, 0]),
        ('N2', ARRAY[0, 0, 3, 0, 0, 0, 0, 0, 2, 1]),
        ('N3', ARRAY[0, 5, 2, 0, 0, 0, 0, 0, 3, 4]),
        ('N4', ARRAY[0, 1, 1, 0, 0, 0, 0, 0, 0, 0]),
        ('Ad', ARRAY[1, 1, 2, 1, 2, 1, 2, 1, 1, 1])
) AS t(fase, arr) CROSS JOIN UNNEST(t.arr) WITH ORDINALITY AS u(val, idx);

-- Talhão 6 (id = 6)
INSERT INTO contagens_fase (talhao_id, codigo_fase, indice_amostra, quantidade)
SELECT 6, fase, idx - 1, val FROM (
    VALUES
        ('Ov', ARRAY[5, 2, 7, 9, 4, 0, 5, 1, 2, 2]),
        ('N1', ARRAY[0, 0, 3, 0, 2, 2, 0, 0, 6, 0]),
        ('N2', ARRAY[0, 0, 1, 0, 0, 2, 0, 0, 2, 1]),
        ('N3', ARRAY[0, 0, 0, 0, 0, 1, 1, 0, 3, 4]),
        ('N4', ARRAY[0, 0, 0, 0, 0, 1, 0, 0, 0, 0]),
        ('Ad', ARRAY[1, 1, 1, 1, 0, 1, 1, 1, 1, 1])
) AS t(fase, arr) CROSS JOIN UNNEST(t.arr) WITH ORDINALITY AS u(val, idx);

-- Talhão 7 (id = 7)
INSERT INTO contagens_fase (talhao_id, codigo_fase, indice_amostra, quantidade)
SELECT 7, fase, idx - 1, val FROM (
    VALUES
        ('Ov', ARRAY[4, 0, 0, 0, 6, 0, 7, 0, 3, 1]),
        ('N1', ARRAY[0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
        ('N2', ARRAY[0, 0, 3, 0, 0, 0, 3, 0, 2, 0]),
        ('N3', ARRAY[6, 0, 7, 2, 3, 1, 7, 0, 4, 6]),
        ('N4', ARRAY[0, 0, 4, 0, 0, 0, 0, 0, 0, 0]),
        ('Ad', ARRAY[7, 8, 9, 11, 2, 2, 3, 5, 1, 2])
) AS t(fase, arr) CROSS JOIN UNNEST(t.arr) WITH ORDINALITY AS u(val, idx);

-- Talhão 8 (id = 8)
INSERT INTO contagens_fase (talhao_id, codigo_fase, indice_amostra, quantidade)
SELECT 8, fase, idx - 1, val FROM (
    VALUES
        ('Ov', ARRAY[9, 0, 1, 2, 1, 2, 0, 7, 5, 2]),
        ('N1', ARRAY[0, 0, 2, 4, 0, 0, 2, 0, 0, 0]),
        ('N2', ARRAY[0, 0, 0, 3, 0, 0, 0, 0, 0, 0]),
        ('N3', ARRAY[1, 0, 0, 1, 0, 0, 0, 3, 0, 0]),
        ('N4', ARRAY[0, 0, 4, 0, 0, 0, 0, 0, 0, 0]),
        ('Ad', ARRAY[1, 1, 5, 1, 1, 1, 1, 2, 1, 1])
) AS t(fase, arr) CROSS JOIN UNNEST(t.arr) WITH ORDINALITY AS u(val, idx);

-- Talhão 9 (id = 9)
INSERT INTO contagens_fase (talhao_id, codigo_fase, indice_amostra, quantidade)
SELECT 9, fase, idx - 1, val FROM (
    VALUES
        ('Ov', ARRAY[8, 1, 8, 9, 4, 3, 0, 0, 7, 9]),
        ('N1', ARRAY[0, 0, 0, 0, 0, 0, 0, 1, 3, 0]),
        ('N2', ARRAY[2, 0, 0, 0, 0, 3, 0, 0, 1, 0]),
        ('N3', ARRAY[1, 0, 3, 0, 0, 1, 0, 0, 0, 0]),
        ('N4', ARRAY[0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
        ('Ad', ARRAY[1, 1, 2, 1, 1, 1, 1, 1, 1, 1])
) AS t(fase, arr) CROSS JOIN UNNEST(t.arr) WITH ORDINALITY AS u(val, idx);

-- Talhão 10 (id = 10)
INSERT INTO contagens_fase (talhao_id, codigo_fase, indice_amostra, quantidade)
SELECT 10, fase, idx - 1, val FROM (
    VALUES
        ('Ov', ARRAY[8, 1, 8, 9, 4, 3, 0, 0, 7, 9]),
        ('N1', ARRAY[0, 0, 0, 0, 0, 0, 0, 1, 3, 0]),
        ('N2', ARRAY[2, 0, 0, 0, 0, 3, 0, 0, 1, 0]),
        ('N3', ARRAY[1, 0, 3, 0, 0, 1, 0, 0, 0, 0]),
        ('N4', ARRAY[0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
        ('Ad', ARRAY[1, 1, 2, 1, 1, 1, 1, 1, 1, 1])
) AS t(fase, arr) CROSS JOIN UNNEST(t.arr) WITH ORDINALITY AS u(val, idx);

-- Contagens para Cenário 2 (Talhões 11..16, 8 amostras por talhão, derivados dos Talhões 1..6)
INSERT INTO contagens_fase (talhao_id, codigo_fase, indice_amostra, quantidade)
SELECT
    t2.id AS talhao_id,
    cf.codigo_fase,
    cf.indice_amostra,
    cf.quantidade
FROM talhoes t2
JOIN contagens_fase cf ON cf.talhao_id = t2.numero_talhao
WHERE t2.cenario_id = 'cen-unirv-02'
  AND cf.indice_amostra < 8;

-- Contagens para Cenário 3 (Talhões 17..21, 12 amostras por talhão, derivados dos Talhões 3..7)
INSERT INTO contagens_fase (talhao_id, codigo_fase, indice_amostra, quantidade)
SELECT
    t3.id AS talhao_id,
    cf.codigo_fase,
    gs.idx AS indice_amostra,
    cf.quantidade
FROM talhoes t3
CROSS JOIN generate_series(0, 11) AS gs(idx)
JOIN contagens_fase cf
  ON cf.talhao_id = (t3.numero_talhao + 2)
 AND cf.indice_amostra = (gs.idx % 10)
WHERE t3.cenario_id = 'cen-unirv-03';

-- =========================================================================================
-- 10. VIEWS ANALÍTICAS PARA CONSULTA RÁPIDA NO BANCO DE DADOS
-- =========================================================================================
CREATE OR REPLACE VIEW vw_resumo_cenarios AS
SELECT
    c.id AS cenario_id,
    c.nome AS cenario_nome,
    c.usuario_nome,
    cu.nome AS cultura_nome,
    cu.nome_cientifico AS cultura_cientifico,
    p.nome_comum AS praga_nome,
    p.nome_cientifico AS praga_cientifico,
    p.ordem AS praga_ordem,
    ae.nome_curto AS area_experimental,
    c.num_talhoes,
    c.num_amostras_por_talhao,
    (c.num_talhoes * c.num_amostras_por_talhao) AS total_pontos_amostrais,
    c.ativo,
    c.criado_em,
    c.atualizado_em
FROM cenarios_analiticos c
JOIN culturas cu ON cu.id = c.cultura_id
JOIN pragas p ON p.id = c.praga_id
LEFT JOIN areas_experimentais ae ON ae.id = c.area_experimental_id
ORDER BY c.criado_em DESC;

CREATE OR REPLACE VIEW vw_soma_fases_por_talhao AS
SELECT
    t.cenario_id,
    t.id AS talhao_id,
    t.numero_talhao,
    t.nome AS talhao_nome,
    cf.codigo_fase,
    SUM(cf.quantidade) AS soma_individuos,
    ROUND(AVG(cf.quantidade), 2) AS media_por_amostra,
    COUNT(cf.id) AS num_amostras
FROM talhoes t
JOIN contagens_fase cf ON cf.talhao_id = t.id
GROUP BY t.cenario_id, t.id, t.numero_talhao, t.nome, cf.codigo_fase
ORDER BY t.cenario_id, t.numero_talhao, cf.codigo_fase;

COMMIT;

