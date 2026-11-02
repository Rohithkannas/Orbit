
export function calculate(expression: string): number | null {
  const input = expression.trim();

  if (!input || input.length > 100) return null;
  if (!/^[\d+\-*/().%\s]+$/.test(input)) return null;

  const matchedTokens = input.match(/\d*\.?\d+|[()+\-*/%]/g);

  if (
    !matchedTokens ||
    matchedTokens.join("") !== input.replace(/\s/g, "")
  ) {
    return null;
  }

  // From this point onward, tokens is guaranteed to be an array.
  const tokens: string[] = matchedTokens;
  let position = 0;

  function parseExpression(): number {
    let value = parseTerm();

    while (tokens[position] === "+" || tokens[position] === "-") {
      const operator = tokens[position++];
      const right = parseTerm();

      value = operator === "+" ? value + right : value - right;
    }

    return value;
  }

  function parseTerm(): number {
    let value = parseUnary();

    while (
      tokens[position] === "*" ||
      tokens[position] === "/" ||
      tokens[position] === "%"
    ) {
      const operator = tokens[position++];
      const right = parseUnary();

      if ((operator === "/" || operator === "%") && right === 0) {
        throw new Error("Division by zero");
      }

      if (operator === "*") value *= right;
      else if (operator === "/") value /= right;
      else value %= right;
    }

    return value;
  }

  function parseUnary(): number {
    if (tokens[position] === "+") {
      position++;
      return parseUnary();
    }

    if (tokens[position] === "-") {
      position++;
      return -parseUnary();
    }

    if (tokens[position] === "(") {
      position++;
      const value = parseExpression();

      if (tokens[position] !== ")") {
        throw new Error("Missing closing parenthesis");
      }

      position++;
      return value;
    }

    const token = tokens[position++];

    if (!token || !/^\d*\.?\d+$/.test(token)) {
      throw new Error("Invalid number");
    }

    return Number(token);
  }

  try {
    const result = parseExpression();

    if (position !== tokens.length || !Number.isFinite(result)) {
      return null;
    }

    return result;
  } catch {
    return null;
  }
}
