# Recipes

## Prototypes

<div>
<dl>

---
<dt><code>▪︎</code> <samp>fragment</samp>
<dd>

Unique <samp>_fragma_<**Fragment**></samp> instance
<dl fragma-fragment>

---
<dt><code>ƒ</code> <samp>render(<var>values</var>?)</samp>
<dd>Renders the fragment with the current (or updated) values</dd>

---
<dt><code>▪︎</code> <samp>values</samp>
<dd>Array values for rendered fragment</dd>

---
<dt><code>▪︎</code> <samp>template</samp>
<dd>

Reference <samp>_fragma_<**Template**></samp> instance used to render the fragment
<dl fragma-template>


---
<dt><code>ƒ</code> <samp>render(<var>values</var>, <var>fragment</var>?)</samp>
<dd>Renders the template's spans with the specified values into a specified or new fragment

> Rendering a template to a new fragment executes a one-time prerender which creates and maps the actual elements to respective spans.
</dd>

---
<dt><code>▪︎</code> <samp>spans</samp>
<dd>

Reference <samp>Array [ … _fragma_<**Span**> ]</samp> instance used to render part of the fragment
<dl fragma-span>

---
<dt><code>ƒ</code> <samp>render(<var>value</var>, <var>fragment</var>)</samp>
<dd>Renders the span using the specified value into the specified template</dd>

---
<dt><code>▪︎</code> <samp>string</samp>
<dd>Leading text part</dd>

---
<dt><code>▪︎</code> <samp>value</samp>
<dd>Trailing value part</dd>

</dl>
</dl>
</dl>

---
</div>
