// @ts-nocheck
// tricc-lang 1.0.0 (packages/core/src/lang/VERSION)
// Generated from TriccFeelParser.g4 by ANTLR 4.13.2
// noinspection ES6UnusedImports,JSUnusedGlobalSymbols,JSUnusedLocalSymbols

import { ATN, ATNDeserializer, DFA, FailedPredicateException, RecognitionException, NoViableAltException, BailErrorStrategy, Parser, ParserATNSimulator, RuleContext, ParserRuleContext, PredictionMode, PredictionContextCache, TerminalNode, RuleNode, Token, Interval, IntervalSet } from 'antlr4';
import type { DecisionState, TokenStream } from 'antlr4';
import TriccFeelParserVisitor from "./TriccFeelParserVisitor.js";

// for running tests with parameters, TODO: discuss strategy for typed parameters in CI
// eslint-disable-next-line no-unused-vars
type int = number;

export default class TriccFeelParser extends Parser {
	public static readonly TriccText = 1;
	public static readonly BooleanLiteral = 2;
	public static readonly FOR = 3;
	public static readonly RETURN = 4;
	public static readonly IN = 5;
	public static readonly IF = 6;
	public static readonly THEN = 7;
	public static readonly ELSE = 8;
	public static readonly SOME = 9;
	public static readonly EVERY = 10;
	public static readonly SATISFIES = 11;
	public static readonly INSTANCE = 12;
	public static readonly OF = 13;
	public static readonly FUNCTION = 14;
	public static readonly EXTERNAL = 15;
	public static readonly OR = 16;
	public static readonly AND = 17;
	public static readonly BETWEEN = 18;
	public static readonly NULL = 19;
	public static readonly UNDEFINEDVALUE = 20;
	public static readonly TRUE = 21;
	public static readonly FALSE = 22;
	public static readonly QUOTE = 23;
	public static readonly IntegerLiteral = 24;
	public static readonly FloatingPointLiteral = 25;
	public static readonly StringLiteral = 26;
	public static readonly LPAREN = 27;
	public static readonly RPAREN = 28;
	public static readonly LBRACE = 29;
	public static readonly RBRACE = 30;
	public static readonly LBRACK = 31;
	public static readonly RBRACK = 32;
	public static readonly COMMA = 33;
	public static readonly ELIPSIS = 34;
	public static readonly DOT = 35;
	public static readonly SPREAD = 36;
	public static readonly EQUAL = 37;
	public static readonly GT = 38;
	public static readonly LT = 39;
	public static readonly LE = 40;
	public static readonly GE = 41;
	public static readonly NOTEQUAL = 42;
	public static readonly COLON = 43;
	public static readonly RARROW = 44;
	public static readonly POW = 45;
	public static readonly ADD = 46;
	public static readonly SUB = 47;
	public static readonly MUL = 48;
	public static readonly DIV = 49;
	public static readonly BANG = 50;
	public static readonly NOT = 51;
	public static readonly AT = 52;
	public static readonly Identifier = 53;
	public static readonly WS = 54;
	public static readonly COMMENT = 55;
	public static readonly LINE_COMMENT = 56;
	public static readonly ANY_OTHER_CHAR = 57;
	public static override readonly EOF = Token.EOF;
	public static readonly RULE_cellRoot = 0;
	public static readonly RULE_cellTests = 1;
	public static readonly RULE_cellTest = 2;
	public static readonly RULE_cellValue = 3;
	public static readonly literalNames: (string | null)[] = [ null, null, 
                                                            null, "'for'", 
                                                            "'return'", 
                                                            "'in'", "'if'", 
                                                            "'then'", "'else'", 
                                                            "'some'", "'every'", 
                                                            "'satisfies'", 
                                                            "'instance'", 
                                                            "'of'", "'function'", 
                                                            "'external'", 
                                                            "'or'", "'and'", 
                                                            "'between'", 
                                                            "'null'", "'undefined'", 
                                                            "'true'", "'false'", 
                                                            "'''", null, 
                                                            null, null, 
                                                            "'('", "')'", 
                                                            "'{'", "'}'", 
                                                            "'['", "']'", 
                                                            "','", "'..'", 
                                                            "'.'", "'...'", 
                                                            "'='", "'>'", 
                                                            "'<'", "'<='", 
                                                            "'>='", "'!='", 
                                                            "':'", "'->'", 
                                                            "'**'", "'+'", 
                                                            "'-'", "'*'", 
                                                            "'/'", "'!'", 
                                                            "'not'", "'@'" ];
	public static readonly symbolicNames: (string | null)[] = [ null, "TriccText", 
                                                             "BooleanLiteral", 
                                                             "FOR", "RETURN", 
                                                             "IN", "IF", 
                                                             "THEN", "ELSE", 
                                                             "SOME", "EVERY", 
                                                             "SATISFIES", 
                                                             "INSTANCE", 
                                                             "OF", "FUNCTION", 
                                                             "EXTERNAL", 
                                                             "OR", "AND", 
                                                             "BETWEEN", 
                                                             "NULL", "UNDEFINEDVALUE", 
                                                             "TRUE", "FALSE", 
                                                             "QUOTE", "IntegerLiteral", 
                                                             "FloatingPointLiteral", 
                                                             "StringLiteral", 
                                                             "LPAREN", "RPAREN", 
                                                             "LBRACE", "RBRACE", 
                                                             "LBRACK", "RBRACK", 
                                                             "COMMA", "ELIPSIS", 
                                                             "DOT", "SPREAD", 
                                                             "EQUAL", "GT", 
                                                             "LT", "LE", 
                                                             "GE", "NOTEQUAL", 
                                                             "COLON", "RARROW", 
                                                             "POW", "ADD", 
                                                             "SUB", "MUL", 
                                                             "DIV", "BANG", 
                                                             "NOT", "AT", 
                                                             "Identifier", 
                                                             "WS", "COMMENT", 
                                                             "LINE_COMMENT", 
                                                             "ANY_OTHER_CHAR" ];
	// tslint:disable:no-trailing-whitespace
	public static readonly ruleNames: string[] = [
		"cellRoot", "cellTests", "cellTest", "cellValue",
	];
	public get grammarFileName(): string { return "TriccFeelParser.g4"; }
	public get literalNames(): (string | null)[] { return TriccFeelParser.literalNames; }
	public get symbolicNames(): (string | null)[] { return TriccFeelParser.symbolicNames; }
	public get ruleNames(): string[] { return TriccFeelParser.ruleNames; }
	public get serializedATN(): number[] { return TriccFeelParser._serializedATN; }

	protected createFailedPredicateException(predicate?: string, message?: string): FailedPredicateException {
		return new FailedPredicateException(this, predicate, message);
	}

	constructor(input: TokenStream) {
		super(input);
		this._interp = new ParserATNSimulator(this, TriccFeelParser._ATN, TriccFeelParser.DecisionsToDFA, new PredictionContextCache());
	}
	// @RuleVersion(0)
	public cellRoot(): CellRootContext {
		let localctx: CellRootContext = new CellRootContext(this, this._ctx, this.state);
		this.enterRule(localctx, 0, TriccFeelParser.RULE_cellRoot);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 8;
			this.cellTests();
			this.state = 9;
			this.match(TriccFeelParser.EOF);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public cellTests(): CellTestsContext {
		let localctx: CellTestsContext = new CellTestsContext(this, this._ctx, this.state);
		this.enterRule(localctx, 2, TriccFeelParser.RULE_cellTests);
		let _la: number;
		try {
			this.state = 24;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 1, this._ctx) ) {
			case 1:
				localctx = new CellAnyContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 11;
				this.match(TriccFeelParser.SUB);
				}
				break;
			case 2:
				localctx = new CellNotNullContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 12;
				this.match(TriccFeelParser.NOT);
				this.state = 13;
				this.match(TriccFeelParser.LPAREN);
				this.state = 14;
				this.match(TriccFeelParser.NULL);
				this.state = 15;
				this.match(TriccFeelParser.RPAREN);
				}
				break;
			case 3:
				localctx = new CellListContext(this, localctx);
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 16;
				this.cellTest();
				this.state = 21;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===33) {
					{
					{
					this.state = 17;
					this.match(TriccFeelParser.COMMA);
					this.state = 18;
					this.cellTest();
					}
					}
					this.state = 23;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public cellTest(): CellTestContext {
		let localctx: CellTestContext = new CellTestContext(this, this._ctx, this.state);
		this.enterRule(localctx, 4, TriccFeelParser.RULE_cellTest);
		let _la: number;
		try {
			this.state = 36;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 37:
			case 38:
			case 39:
			case 40:
			case 41:
				localctx = new CellCompareContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 26;
				(localctx as CellCompareContext)._op = this._input.LT(1);
				_la = this._input.LA(1);
				if(!(((((_la - 37)) & ~0x1F) === 0 && ((1 << (_la - 37)) & 31) !== 0))) {
				    (localctx as CellCompareContext)._op = this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				this.state = 27;
				this.cellValue();
				}
				break;
			case 19:
				localctx = new CellNullContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 28;
				this.match(TriccFeelParser.NULL);
				}
				break;
			case 27:
			case 31:
			case 32:
				localctx = new CellRangeContext(this, localctx);
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 29;
				(localctx as CellRangeContext)._low = this._input.LT(1);
				_la = this._input.LA(1);
				if(!(((((_la - 27)) & ~0x1F) === 0 && ((1 << (_la - 27)) & 49) !== 0))) {
				    (localctx as CellRangeContext)._low = this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				this.state = 30;
				this.cellValue();
				this.state = 31;
				this.match(TriccFeelParser.ELIPSIS);
				this.state = 32;
				this.cellValue();
				this.state = 33;
				(localctx as CellRangeContext)._up = this._input.LT(1);
				_la = this._input.LA(1);
				if(!(((((_la - 28)) & ~0x1F) === 0 && ((1 << (_la - 28)) & 25) !== 0))) {
				    (localctx as CellRangeContext)._up = this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				}
				break;
			case 1:
			case 2:
			case 24:
			case 25:
			case 26:
			case 47:
				localctx = new CellEqualsContext(this, localctx);
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 35;
				this.cellValue();
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public cellValue(): CellValueContext {
		let localctx: CellValueContext = new CellValueContext(this, this._ctx, this.state);
		this.enterRule(localctx, 6, TriccFeelParser.RULE_cellValue);
		let _la: number;
		try {
			this.state = 45;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 24:
			case 25:
			case 47:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 39;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===47) {
					{
					this.state = 38;
					this.match(TriccFeelParser.SUB);
					}
				}

				this.state = 41;
				_la = this._input.LA(1);
				if(!(_la===24 || _la===25)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				}
				break;
			case 1:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 42;
				this.match(TriccFeelParser.TriccText);
				}
				break;
			case 26:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 43;
				this.match(TriccFeelParser.StringLiteral);
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 44;
				this.match(TriccFeelParser.BooleanLiteral);
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}

	public static readonly _serializedATN: number[] = [4,1,57,48,2,0,7,0,2,
	1,7,1,2,2,7,2,2,3,7,3,1,0,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,5,1,20,
	8,1,10,1,12,1,23,9,1,3,1,25,8,1,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,
	3,2,37,8,2,1,3,3,3,40,8,3,1,3,1,3,1,3,1,3,3,3,46,8,3,1,3,0,0,4,0,2,4,6,
	0,4,1,0,37,41,2,0,27,27,31,32,2,0,28,28,31,32,1,0,24,25,53,0,8,1,0,0,0,
	2,24,1,0,0,0,4,36,1,0,0,0,6,45,1,0,0,0,8,9,3,2,1,0,9,10,5,0,0,1,10,1,1,
	0,0,0,11,25,5,47,0,0,12,13,5,51,0,0,13,14,5,27,0,0,14,15,5,19,0,0,15,25,
	5,28,0,0,16,21,3,4,2,0,17,18,5,33,0,0,18,20,3,4,2,0,19,17,1,0,0,0,20,23,
	1,0,0,0,21,19,1,0,0,0,21,22,1,0,0,0,22,25,1,0,0,0,23,21,1,0,0,0,24,11,1,
	0,0,0,24,12,1,0,0,0,24,16,1,0,0,0,25,3,1,0,0,0,26,27,7,0,0,0,27,37,3,6,
	3,0,28,37,5,19,0,0,29,30,7,1,0,0,30,31,3,6,3,0,31,32,5,34,0,0,32,33,3,6,
	3,0,33,34,7,2,0,0,34,37,1,0,0,0,35,37,3,6,3,0,36,26,1,0,0,0,36,28,1,0,0,
	0,36,29,1,0,0,0,36,35,1,0,0,0,37,5,1,0,0,0,38,40,5,47,0,0,39,38,1,0,0,0,
	39,40,1,0,0,0,40,41,1,0,0,0,41,46,7,3,0,0,42,46,5,1,0,0,43,46,5,26,0,0,
	44,46,5,2,0,0,45,39,1,0,0,0,45,42,1,0,0,0,45,43,1,0,0,0,45,44,1,0,0,0,46,
	7,1,0,0,0,5,21,24,36,39,45];

	private static __ATN: ATN;
	public static get _ATN(): ATN {
		if (!TriccFeelParser.__ATN) {
			TriccFeelParser.__ATN = new ATNDeserializer().deserialize(TriccFeelParser._serializedATN);
		}

		return TriccFeelParser.__ATN;
	}


	static DecisionsToDFA = TriccFeelParser._ATN.decisionToState.map( (ds: DecisionState, index: number) => new DFA(ds, index) );

}

export class CellRootContext extends ParserRuleContext {
	constructor(parser?: TriccFeelParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public cellTests(): CellTestsContext {
		return this.getTypedRuleContext(CellTestsContext, 0) as CellTestsContext;
	}
	public EOF(): TerminalNode {
		return this.getToken(TriccFeelParser.EOF, 0);
	}
    public get ruleIndex(): number {
    	return TriccFeelParser.RULE_cellRoot;
	}
	// @Override
	public accept<Result>(visitor: TriccFeelParserVisitor<Result>): Result {
		if (visitor.visitCellRoot) {
			return visitor.visitCellRoot(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class CellTestsContext extends ParserRuleContext {
	constructor(parser?: TriccFeelParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return TriccFeelParser.RULE_cellTests;
	}
	public override copyFrom(ctx: CellTestsContext): void {
		super.copyFrom(ctx);
	}
}
export class CellNotNullContext extends CellTestsContext {
	constructor(parser: TriccFeelParser, ctx: CellTestsContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public NOT(): TerminalNode {
		return this.getToken(TriccFeelParser.NOT, 0);
	}
	public LPAREN(): TerminalNode {
		return this.getToken(TriccFeelParser.LPAREN, 0);
	}
	public NULL(): TerminalNode {
		return this.getToken(TriccFeelParser.NULL, 0);
	}
	public RPAREN(): TerminalNode {
		return this.getToken(TriccFeelParser.RPAREN, 0);
	}
	// @Override
	public accept<Result>(visitor: TriccFeelParserVisitor<Result>): Result {
		if (visitor.visitCellNotNull) {
			return visitor.visitCellNotNull(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class CellListContext extends CellTestsContext {
	constructor(parser: TriccFeelParser, ctx: CellTestsContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public cellTest_list(): CellTestContext[] {
		return this.getTypedRuleContexts(CellTestContext) as CellTestContext[];
	}
	public cellTest(i: number): CellTestContext {
		return this.getTypedRuleContext(CellTestContext, i) as CellTestContext;
	}
	public COMMA_list(): TerminalNode[] {
	    	return this.getTokens(TriccFeelParser.COMMA);
	}
	public COMMA(i: number): TerminalNode {
		return this.getToken(TriccFeelParser.COMMA, i);
	}
	// @Override
	public accept<Result>(visitor: TriccFeelParserVisitor<Result>): Result {
		if (visitor.visitCellList) {
			return visitor.visitCellList(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class CellAnyContext extends CellTestsContext {
	constructor(parser: TriccFeelParser, ctx: CellTestsContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public SUB(): TerminalNode {
		return this.getToken(TriccFeelParser.SUB, 0);
	}
	// @Override
	public accept<Result>(visitor: TriccFeelParserVisitor<Result>): Result {
		if (visitor.visitCellAny) {
			return visitor.visitCellAny(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class CellTestContext extends ParserRuleContext {
	constructor(parser?: TriccFeelParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return TriccFeelParser.RULE_cellTest;
	}
	public override copyFrom(ctx: CellTestContext): void {
		super.copyFrom(ctx);
	}
}
export class CellRangeContext extends CellTestContext {
	public _low!: Token;
	public _up!: Token;
	constructor(parser: TriccFeelParser, ctx: CellTestContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public cellValue_list(): CellValueContext[] {
		return this.getTypedRuleContexts(CellValueContext) as CellValueContext[];
	}
	public cellValue(i: number): CellValueContext {
		return this.getTypedRuleContext(CellValueContext, i) as CellValueContext;
	}
	public ELIPSIS(): TerminalNode {
		return this.getToken(TriccFeelParser.ELIPSIS, 0);
	}
	public LPAREN(): TerminalNode {
		return this.getToken(TriccFeelParser.LPAREN, 0);
	}
	public LBRACK_list(): TerminalNode[] {
	    	return this.getTokens(TriccFeelParser.LBRACK);
	}
	public LBRACK(i: number): TerminalNode {
		return this.getToken(TriccFeelParser.LBRACK, i);
	}
	public RBRACK_list(): TerminalNode[] {
	    	return this.getTokens(TriccFeelParser.RBRACK);
	}
	public RBRACK(i: number): TerminalNode {
		return this.getToken(TriccFeelParser.RBRACK, i);
	}
	public RPAREN(): TerminalNode {
		return this.getToken(TriccFeelParser.RPAREN, 0);
	}
	// @Override
	public accept<Result>(visitor: TriccFeelParserVisitor<Result>): Result {
		if (visitor.visitCellRange) {
			return visitor.visitCellRange(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class CellEqualsContext extends CellTestContext {
	constructor(parser: TriccFeelParser, ctx: CellTestContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public cellValue(): CellValueContext {
		return this.getTypedRuleContext(CellValueContext, 0) as CellValueContext;
	}
	// @Override
	public accept<Result>(visitor: TriccFeelParserVisitor<Result>): Result {
		if (visitor.visitCellEquals) {
			return visitor.visitCellEquals(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class CellNullContext extends CellTestContext {
	constructor(parser: TriccFeelParser, ctx: CellTestContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public NULL(): TerminalNode {
		return this.getToken(TriccFeelParser.NULL, 0);
	}
	// @Override
	public accept<Result>(visitor: TriccFeelParserVisitor<Result>): Result {
		if (visitor.visitCellNull) {
			return visitor.visitCellNull(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class CellCompareContext extends CellTestContext {
	public _op!: Token;
	constructor(parser: TriccFeelParser, ctx: CellTestContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public cellValue(): CellValueContext {
		return this.getTypedRuleContext(CellValueContext, 0) as CellValueContext;
	}
	public LT(): TerminalNode {
		return this.getToken(TriccFeelParser.LT, 0);
	}
	public GT(): TerminalNode {
		return this.getToken(TriccFeelParser.GT, 0);
	}
	public LE(): TerminalNode {
		return this.getToken(TriccFeelParser.LE, 0);
	}
	public GE(): TerminalNode {
		return this.getToken(TriccFeelParser.GE, 0);
	}
	public EQUAL(): TerminalNode {
		return this.getToken(TriccFeelParser.EQUAL, 0);
	}
	// @Override
	public accept<Result>(visitor: TriccFeelParserVisitor<Result>): Result {
		if (visitor.visitCellCompare) {
			return visitor.visitCellCompare(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class CellValueContext extends ParserRuleContext {
	constructor(parser?: TriccFeelParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public IntegerLiteral(): TerminalNode {
		return this.getToken(TriccFeelParser.IntegerLiteral, 0);
	}
	public FloatingPointLiteral(): TerminalNode {
		return this.getToken(TriccFeelParser.FloatingPointLiteral, 0);
	}
	public SUB(): TerminalNode {
		return this.getToken(TriccFeelParser.SUB, 0);
	}
	public TriccText(): TerminalNode {
		return this.getToken(TriccFeelParser.TriccText, 0);
	}
	public StringLiteral(): TerminalNode {
		return this.getToken(TriccFeelParser.StringLiteral, 0);
	}
	public BooleanLiteral(): TerminalNode {
		return this.getToken(TriccFeelParser.BooleanLiteral, 0);
	}
    public get ruleIndex(): number {
    	return TriccFeelParser.RULE_cellValue;
	}
	// @Override
	public accept<Result>(visitor: TriccFeelParserVisitor<Result>): Result {
		if (visitor.visitCellValue) {
			return visitor.visitCellValue(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
