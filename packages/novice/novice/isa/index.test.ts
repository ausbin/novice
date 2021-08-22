import * as index from "./index"
// @ponicode
describe("index.getIsa", () => {
    test("0", () => {
        let callFunction: any = () => {
            index.getIsa("AM32WSU")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            index.getIsa("LE53KBN")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            index.getIsa("UP72NWV")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            index.getIsa("IM68JBJ")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            index.getIsa("HR47NOU")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            index.getIsa("")
        }
    
        expect(callFunction).not.toThrow()
    })
})
