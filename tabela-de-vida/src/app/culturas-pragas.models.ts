export interface PragaInfo {
  id: string;
  culturaId: string;
  nomeComum: string;
  nomeCientifico: string;
  ordem: string;
  faseCriticaTipica: string;
  descricao: string;
  imagem: string;
  fasesSugeridas: string[];
}

export interface CulturaInfo {
  id: string;
  nome: string;
  nomeCientifico: string;
  familia: string;
  descricao: string;
  imagem: string;
  pragas: PragaInfo[];
}

export interface UnirvExperimentalArea {
  id: string;
  nome: string;
  nomeCurto: string;
  descricao: string;
  dmsLat: string;
  dmsLng: string;
  latitude: number;
  longitude: number;
}

