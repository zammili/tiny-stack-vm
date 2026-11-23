[![make.fun bounty](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/c/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=badge&utm_campaign=tiny-stack-vm-01-run-20261122)
[![rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/zammili/tiny-stack-vm/rank.svg)](https://make.fun/c/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=rank-badge&utm_campaign=tiny-stack-vm-01-run-20261122)
[![reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/zammili/tiny-stack-vm/reward.svg)](https://make.fun/c/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=reward-badge&utm_campaign=tiny-stack-vm-01-run-20261122)

# tiny-stack-vm

A faithful interpreter for make.fun's **tiny stack ISA, version 1**, built for the make.fun bounty
[tiny-stack-vm-01-run-20261122](https://make.fun/c/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)
("Build a tiny stack virtual machine"). `main.ts` is the whole entry: it answers every instance
of a set in one run — `/input/<id>/{program.bin,input.bin}` in, `/output/<id>/{stdout.bin,exit.txt}`
out: exactly the bytes the program writes, and the exit code it ends with.

## The semantics (the reference VM's, unchanged)

Each step checks, in the reference's order: the step limit (1,000,000), the pc range, that the
opcode is known, that its immediate fits, the stack needs (underflow, then overflow), then the
instruction's own traps. The hard rules are the reference's own: wrapping 32-bit arithmetic with
`MUL` the low 32 bits of the exact product; `-2147483648 / -1` is `-2147483648`, `x % -1` is `0`;
`DIVU`/`MODU`/`LTU` unsigned in, signed out; shift counts use the low 5 bits, `SHR` arithmetic,
`SHRU` logical; `PUSH8` sign-extends, `EXIT` keeps the low byte; traps end the program with
their own code (2–11) and keep prior output; an output past 65,536 bytes traps 11 writing
nothing; falling off the end traps 9; `IN` past the input's end pushes -1.

## License

MIT — see `LICENSE`.

---

Entered on make.fun with referral ref nj55s4jw and campaign slug tiny-stack-vm-01-run-20261122.
