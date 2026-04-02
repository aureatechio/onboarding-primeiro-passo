/**
 * Módulo compartilhado de validação de dados
 * Contém regras de negócio para CPF, CNPJ, E-mail, CEP e Telefone.
 * Deve manter paridade lógica com o frontend (src/script.js).
 */

/**
 * Valida CPF (Cadastro de Pessoas Físicas)
 * Verifica formato, tamanho, dígitos repetidos e dígitos verificadores.
 */
export function validateCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '');
  
  if (cleanCPF.length !== 11) return false;
  
  // CPFs inválidos conhecidos (todos dígitos iguais)
  if (/^(\d)\1+$/.test(cleanCPF)) return false;
  
  // Validação do primeiro dígito
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit > 9) digit = 0;
  if (digit !== parseInt(cleanCPF.charAt(9))) return false;
  
  // Validação do segundo dígito
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit > 9) digit = 0;
  if (digit !== parseInt(cleanCPF.charAt(10))) return false;
  
  return true;
}

/**
 * Valida CNPJ (Cadastro Nacional da Pessoa Jurídica)
 * Verifica formato, tamanho, dígitos repetidos e dígitos verificadores.
 */
export function validateCNPJ(cnpj: string): boolean {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  if (cleanCNPJ.length !== 14) return false;
  
  // CNPJs inválidos conhecidos
  if (/^(\d)\1+$/.test(cleanCNPJ)) return false;
  
  let size = cleanCNPJ.length - 2;
  let numbers = cleanCNPJ.substring(0, size);
  let digits = cleanCNPJ.substring(size);
  let sum = 0;
  let pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  
  size = size + 1;
  numbers = cleanCNPJ.substring(0, size);
  sum = 0;
  pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
}

/**
 * Valida CPF ou CNPJ de forma genérica
 */
export function validateDocument(document: string): boolean {
  const cleanDoc = document.replace(/\D/g, '');
  
  if (cleanDoc.length === 11) {
    return validateCPF(cleanDoc);
  } else if (cleanDoc.length === 14) {
    return validateCNPJ(cleanDoc);
  }
  
  return false;
}

/**
 * Valida E-mail
 * Utiliza Regex padrão para verificar formato user@domain.tld
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;

  const normalized = email.trim();
  if (!normalized) return false;

  // Reject common bad tokens that often slip through manual CC input.
  if (
    normalized.includes(',') ||
    normalized.includes(';') ||
    /\s/.test(normalized)
  ) {
    return false;
  }

  const parts = normalized.split('@');
  if (parts.length !== 2) return false;
  const local = parts[0];
  const domain = parts[1];
  if (!local || !domain) return false;

  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) {
    return false;
  }

  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
    return false;
  }

  const labels = domain.split('.');
  if (labels.length < 2) return false;
  if (labels.some((label) => label.length === 0)) return false;
  if (
    labels.some(
      (label) =>
        !/^[A-Za-z0-9-]+$/.test(label) ||
        label.startsWith('-') ||
        label.endsWith('-')
    )
  ) {
    return false;
  }

  const tld = labels[labels.length - 1];
  if (!tld || tld.length < 2 || !/^[A-Za-z]{2,}$/.test(tld)) return false;

  return /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local);
}

/**
 * Valida CEP (Código de Endereçamento Postal)
 * Aceita formato 12345-678 ou 12345678
 */
export function validateCEP(cep: string): boolean {
  if (!cep) return false;
  const cleanCEP = cep.replace(/\D/g, '');
  return cleanCEP.length === 8;
}

/**
 * Valida Telefone Brasileiro
 * Aceita formatos com 10 ou 11 dígitos (com DDD)
 * Ex: (11) 98765-4321 ou 11987654321
 */
export function validatePhone(phone: string): boolean {
  if (!phone) return false;
  const cleanPhone = phone.replace(/\D/g, '');
  // DDD + Número (Fixo: 8, Celular: 9) = 10 ou 11 dígitos
  return cleanPhone.length >= 10 && cleanPhone.length <= 11;
}
