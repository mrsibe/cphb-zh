-- Attach a language class to fenced code blocks so that
-- mdBook (syntax highlighting) and Typst (PDF) can render them well.
--
-- Most listings in CPHB are C++; a few are pure program input/output
-- samples, which we tag as plain text instead.

local function looks_like_cpp(code)
  if code:match("#include") then return true end
  if code:match("int main") then return true end
  if code:match("vector<") or code:match("cout") or code:match("cin") then return true end
  if code:match("for%s*%(") or code:match("while%s*%(") then return true end
  if code:match(";%s*\n") or code:match(";%s*$") then return true end
  if code:match("^%s*//") then return true end
  return false
end

function CodeBlock(el)
  local lang = "text"
  if looks_like_cpp(el.text) then
    lang = "cpp"
  end
  return pandoc.CodeBlock(el.text, { lang })
end
