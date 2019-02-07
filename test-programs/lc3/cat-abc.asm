.orig x3000

; outputs stdin to stdout until it hits a character which is not a lowercase
; letter a-z

and r3, r3, 0 ; r3 <- 0
loop getc ; r0 <- input
ld r2, ascii_a
not r2, r2
add r2, r2, 1 ; r2 <- -'a'
add r2, r2, r0 ; r2 <- c - 'a'
brn done
ld r2, ascii_z
not r2, r2
add r2, r2, 1 ; r2 <- -'z'
add r2, r2, r0 ; r2 <- c - 'z'
brp done
out
add r3, r0, 0
br loop
done add r3, r3, 0
brz die
ld r0, ascii_lf
out
die halt
ascii_a .fill 'a'
ascii_z .fill 'z'
ascii_lf .fill '\n'

.end
