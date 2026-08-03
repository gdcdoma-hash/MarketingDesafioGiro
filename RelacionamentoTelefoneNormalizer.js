function rel_telefone_normalizar_(valor) {
  let digitos = String(valor || '').replace(/\D/g, '');
  const invalido = motivo => ({
    valido: false,
    telefoneNormalizado: '',
    telefoneExibicao: '',
    motivo: motivo
  });

  if (!digitos) return invalido('Telefone vazio.');
  if (digitos.indexOf('00') === 0) digitos = digitos.slice(2);
  if (digitos.length === 12 || digitos.length === 13) {
    if (digitos.indexOf('55') !== 0) return invalido('Código do país diferente de 55.');
    digitos = digitos.slice(2);
  }
  if (digitos.length !== 10 && digitos.length !== 11) {
    return invalido('Quantidade de dígitos inválida.');
  }
  if (!/^[1-9]{2}/.test(digitos)) return invalido('DDD inválido.');
  if (/^(\d)\1+$/.test(digitos)) return invalido('Telefone com dígitos repetidos.');
  if (digitos.length === 11 && digitos.charAt(2) !== '9') {
    return invalido('Celular deve começar com 9.');
  }
  if (digitos.length === 10 && !/[2-5]/.test(digitos.charAt(2))) {
    return invalido('Telefone fixo inválido.');
  }

  const telefoneNormalizado = '55' + digitos;
  const ddd = digitos.slice(0, 2);
  const numero = digitos.slice(2);
  const telefoneExibicao = numero.length === 9
    ? '+55 ' + ddd + ' ' + numero.slice(0, 5) + '-' + numero.slice(5)
    : '+55 ' + ddd + ' ' + numero.slice(0, 4) + '-' + numero.slice(4);
  return {
    valido: true,
    telefoneNormalizado: telefoneNormalizado,
    telefoneExibicao: telefoneExibicao,
    motivo: ''
  };
}
