.orig x4000
bob
add r6, r6, -1
str r0, r6, 0
ret
.end

.orig x3000
lea r0, message
puts
halt

message .stringz "hello, world!"
.end
