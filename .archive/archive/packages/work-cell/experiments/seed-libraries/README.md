# Seed libraries

Seed libraries are title catalogs for experimental association fields. They
are not corpora, a canon, a naming vocabulary, or a list of approved allusions.
A run first forms a deterministic random shelf of book titles. An Agent then
activates a few titles through fallible memory, or a tool-capable runtime
retrieves material from external sources. Randomness changes availability; it
does not claim relevance.

`chinese-classics.v1.json` deliberately contains only stable technical IDs and
book titles. It does not bundle excerpts, quotations, editions, locators,
summaries, or synthetic descriptions. The current DeepSeek adapter has no
external corpus tool unless the caller injects one, so the default treatment
labels its activation basis as `memory` and must not present remembered wording
as an exact quotation. The experimental Wikisource retriever resolves a title
only at runtime and preserves its locator, URL, bounded excerpt, and digest in
the run record rather than copying that evidence into this catalog. It follows
the [MediaWiki Action API etiquette](https://www.mediawiki.org/wiki/API:Etiquette/en):
identified requests, serial access with an interval, `maxlag`, caching, and
bounded `Retry-After` handling.

An experiment may reserve one deterministic balanced participation seat in
each random shelf. The reserved title must be activated, while at least one
other title seat remains under Agent choice. This changes which books can enter
the field; it does not label a title relevant, supply an interpretation, or
constrain what form the later artifact takes.

The broader, human-reviewed intake scope is maintained in
[`CANDIDATES.md`](CANDIDATES.md). Catalog membership is neither evidence that
a model trained on the work nor a claim that the title will be useful in a
particular activation.
