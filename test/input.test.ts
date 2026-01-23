import { InputParser } from '../src/input';

describe('InputParser', () => {
    let parser: InputParser;
    let keyHandler: jest.Mock;
    let mouseHandler: jest.Mock;
    let scrollUpHandler: jest.Mock;
    let scrollDownHandler: jest.Mock;

    beforeEach(() => {
        parser = new InputParser();
        keyHandler = jest.fn();
        mouseHandler = jest.fn();
        scrollUpHandler = jest.fn();
        scrollDownHandler = jest.fn();

        parser.on('keypress', keyHandler);
        parser.on('mouse', mouseHandler);
        parser.on('scrollup', scrollUpHandler);
        parser.on('scrolldown', scrollDownHandler);
    });

    afterEach(() => {
        parser.removeAllListeners();
    });

    describe('Basic Input', () => {
        it('should emit regular characters', () => {
            parser.feed(Buffer.from('a'));
            expect(keyHandler).toHaveBeenCalledWith('a', expect.any(Buffer));
        });

        it('should emit newline for return', () => {
            parser.feed(Buffer.from('\r'));
            expect(keyHandler).toHaveBeenCalledWith('\n', expect.any(Buffer));
        });

        it('should handle multiple characters', () => {
            parser.feed(Buffer.from('abc'));
            expect(keyHandler).toHaveBeenCalledTimes(3);
            expect(keyHandler).toHaveBeenNthCalledWith(1, 'a', expect.any(Buffer));
            expect(keyHandler).toHaveBeenNthCalledWith(2, 'b', expect.any(Buffer));
            expect(keyHandler).toHaveBeenNthCalledWith(3, 'c', expect.any(Buffer));
        });
    });

    describe('ANSI Sequences', () => {
        it('should handle Arrow Up (\x1b[A)', () => {
            parser.feed(Buffer.from('\x1b[A'));
            expect(keyHandler).toHaveBeenCalledWith('\x1b[A', expect.any(Buffer));
        });

        it('should handle bare ESC with timeout', (done) => {
            parser.feed(Buffer.from('\x1b'));
            expect(keyHandler).not.toHaveBeenCalled();

            // Wait for timeout (20ms in code)
            setTimeout(() => {
                expect(keyHandler).toHaveBeenCalledWith('\x1b', expect.any(Buffer));
                done();
            }, 50);
        });

        it('should handle ESC + char (Alt+Key)', () => {
            parser.feed(Buffer.from('\x1ba'));
            // Should happen immediately without timeout
            expect(keyHandler).toHaveBeenCalledWith('\x1ba', expect.any(Buffer));
        });
    });

    describe('Mouse Events (SGR)', () => {
        it('should parse mouse click', () => {
            // <0;20;10M -> Button 0 (Left), x=20, y=10, Press (M)
            parser.feed(Buffer.from('\x1b[<0;20;10M'));
            
            expect(mouseHandler).toHaveBeenCalledWith({
                name: 'mouse',
                x: 20,
                y: 10,
                button: 0,
                action: 'press'
            });
        });

        it('should parse mouse release', () => {
            // <0;20;10m -> Release (m)
            parser.feed(Buffer.from('\x1b[<0;20;10m'));
            
            expect(mouseHandler).toHaveBeenCalledWith({
                name: 'mouse',
                x: 20,
                y: 10,
                button: 0,
                action: 'release'
            });
        });

        it('should parse mouse move', () => {
            // Button + 32 = Motion. 0 + 32 = 32.
            parser.feed(Buffer.from('\x1b[<32;20;10M'));
            
            expect(mouseHandler).toHaveBeenCalledWith({
                name: 'mouse',
                x: 20,
                y: 10,
                button: 0,
                action: 'move'
            });
        });

        it('should parse scroll up', () => {
            // Button 64 = Scroll Up
            parser.feed(Buffer.from('\x1b[<64;20;10M'));
            
            expect(mouseHandler).toHaveBeenCalledWith({
                name: 'mouse',
                x: 20,
                y: 10,
                button: 0,
                action: 'scroll',
                scroll: 'up'
            });
            expect(scrollUpHandler).toHaveBeenCalled();
        });

        it('should parse scroll down', () => {
            // Button 65 = Scroll Down
            parser.feed(Buffer.from('\x1b[<65;20;10M'));
            
            expect(mouseHandler).toHaveBeenCalledWith({
                name: 'mouse',
                x: 20,
                y: 10,
                button: 0,
                action: 'scroll',
                scroll: 'down'
            });
            expect(scrollDownHandler).toHaveBeenCalled();
        });
    });

    describe('Fragmented Input', () => {
        it('should handle fragmented CSI sequence', () => {
            // \x1b [ A split into three chunks
            parser.feed(Buffer.from('\x1b'));
            parser.feed(Buffer.from('['));
            parser.feed(Buffer.from('A'));
            
            expect(keyHandler).toHaveBeenCalledWith('\x1b[A', expect.any(Buffer));
        });

        it('should handle fragmented Mouse sequence', () => {
            // \x1b [ < 0 ; 1 ; 1 M
            parser.feed(Buffer.from('\x1b['));
            parser.feed(Buffer.from('<0;1'));
            parser.feed(Buffer.from(';1M'));

            expect(mouseHandler).toHaveBeenCalledWith({
                name: 'mouse',
                x: 1,
                y: 1,
                button: 0,
                action: 'press'
            });
        });
    });
});
