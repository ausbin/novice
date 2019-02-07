.orig x3000

; outputs stdin to stdout until it hits the ASCII EOT character (0x04),
; inclusively

loop getc ; r0 <- input
out
add r0, r0, -4
brnp loop
halt

.end
