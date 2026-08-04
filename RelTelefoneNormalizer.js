function rel_telefone_normalizar_(valor) {
  let digitos = String(valor || '').replace(/\D/g, '');
  const dddsValidos = /^(1[1-9]|2[12478]|3[1-578]|4[1-9]|5[13-5]|6[1-9]|7[134579]|8[1-9]|9[1-9])$/;
  const invalido = motivo => ({
    valido: false,
    telefoneNormalizado: '',
    telefoneExibicao: '',
    motivo: motivo
  });

  if (!digitos) return invalido('Telefone vazio.');
  if (digitos.indexOf('00') === 0) digitos = digitos.slice(2);
  if ([10, 11, 12, 13].indexOf(digitos.length) === -1) {
    return invalido('Quantidade de dígitos inválida.');
  }
  if (digitos.length === 12 || digitos.length === 13) {
    if (digitos.indexOf('55') !== 0) return invalido('Código do país diferente de 55.');
    digitos = digitos.slice(2);
  }

  const ddd = digitos.slice(0, 2);
  let numero = digitos.slice(2);

  if (digitos.length === 10) {
    if (!/^[6-9]\d{7}$/.test(numero)) return invalido('Telefone inválido.');
    numero = '9' + numero;
  }

  if (!dddsValidos.test(ddd)) return invalido('DDD inválido.');
  if (/^(\d)\1+$/.test(digitos)) return invalido('Telefone com dígitos repetidos.');
  if (numero.charAt(0) !== '9') return invalido('Celular deve começar com 9.');
  if (!/^9\d{8}$/.test(numero)) return invalido('Telefone inválido.');

  const telefoneNormalizado = '55' + ddd + numero;
  const telefoneExibicao = '+55 ' + ddd + ' ' + numero.slice(0, 5) + '-' + numero.slice(5);
  return {
    valido: true,
    telefoneNormalizado: telefoneNormalizado,
    telefoneExibicao: telefoneExibicao,
    motivo: ''
  };
}
