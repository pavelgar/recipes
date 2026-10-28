# Database

## Writing several rows

Write a change that touches several rows as one `db.batch([...])` call. libsql runs a batch as one transaction in a single synchronous call, so no other request's query lands in the middle of it.

`db.transaction()` stays open across every `await` in its callback, and while it is open every other save fails at once with `SQLITE_BUSY`, WAL mode or not. A busy timeout makes it worse: the wait blocks Node's one thread, so the open transaction can't finish, and the server freezes until the wait runs out.

When a statement needs an earlier one's result, such as a new row's id, get it in SQL inside the batch: a subquery, or `last_insert_rowid()`.
