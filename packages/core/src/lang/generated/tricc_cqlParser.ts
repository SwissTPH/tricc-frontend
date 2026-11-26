// @ts-nocheck
// tricc-lang 1.0.0 (packages/core/src/lang/VERSION)
// Generated from tricc_cql.g4 by ANTLR 4.13.2
// noinspection ES6UnusedImports,JSUnusedGlobalSymbols,JSUnusedLocalSymbols

import { ATN, ATNDeserializer, DFA, FailedPredicateException, RecognitionException, NoViableAltException, BailErrorStrategy, Parser, ParserATNSimulator, RuleContext, ParserRuleContext, PredictionMode, PredictionContextCache, TerminalNode, RuleNode, Token, Interval, IntervalSet } from 'antlr4';
import type { DecisionState, TokenStream } from 'antlr4';
import tricc_cqlVisitor from "./tricc_cqlVisitor.js";

// for running tests with parameters, TODO: discuss strategy for typed parameters in CI
// eslint-disable-next-line no-unused-vars
type int = number;

export default class tricc_cqlParser extends Parser {
	public static readonly T__0 = 1;
	public static readonly T__1 = 2;
	public static readonly T__2 = 3;
	public static readonly T__3 = 4;
	public static readonly T__4 = 5;
	public static readonly T__5 = 6;
	public static readonly T__6 = 7;
	public static readonly T__7 = 8;
	public static readonly T__8 = 9;
	public static readonly T__9 = 10;
	public static readonly T__10 = 11;
	public static readonly T__11 = 12;
	public static readonly T__12 = 13;
	public static readonly T__13 = 14;
	public static readonly T__14 = 15;
	public static readonly T__15 = 16;
	public static readonly T__16 = 17;
	public static readonly T__17 = 18;
	public static readonly T__18 = 19;
	public static readonly T__19 = 20;
	public static readonly T__20 = 21;
	public static readonly T__21 = 22;
	public static readonly T__22 = 23;
	public static readonly T__23 = 24;
	public static readonly T__24 = 25;
	public static readonly T__25 = 26;
	public static readonly T__26 = 27;
	public static readonly T__27 = 28;
	public static readonly T__28 = 29;
	public static readonly T__29 = 30;
	public static readonly T__30 = 31;
	public static readonly T__31 = 32;
	public static readonly T__32 = 33;
	public static readonly T__33 = 34;
	public static readonly T__34 = 35;
	public static readonly T__35 = 36;
	public static readonly T__36 = 37;
	public static readonly T__37 = 38;
	public static readonly T__38 = 39;
	public static readonly T__39 = 40;
	public static readonly T__40 = 41;
	public static readonly T__41 = 42;
	public static readonly T__42 = 43;
	public static readonly T__43 = 44;
	public static readonly T__44 = 45;
	public static readonly T__45 = 46;
	public static readonly T__46 = 47;
	public static readonly T__47 = 48;
	public static readonly T__48 = 49;
	public static readonly T__49 = 50;
	public static readonly T__50 = 51;
	public static readonly T__51 = 52;
	public static readonly T__52 = 53;
	public static readonly T__53 = 54;
	public static readonly T__54 = 55;
	public static readonly T__55 = 56;
	public static readonly T__56 = 57;
	public static readonly T__57 = 58;
	public static readonly T__58 = 59;
	public static readonly T__59 = 60;
	public static readonly T__60 = 61;
	public static readonly T__61 = 62;
	public static readonly T__62 = 63;
	public static readonly T__63 = 64;
	public static readonly T__64 = 65;
	public static readonly T__65 = 66;
	public static readonly T__66 = 67;
	public static readonly T__67 = 68;
	public static readonly T__68 = 69;
	public static readonly T__69 = 70;
	public static readonly T__70 = 71;
	public static readonly T__71 = 72;
	public static readonly T__72 = 73;
	public static readonly T__73 = 74;
	public static readonly T__74 = 75;
	public static readonly T__75 = 76;
	public static readonly T__76 = 77;
	public static readonly T__77 = 78;
	public static readonly T__78 = 79;
	public static readonly T__79 = 80;
	public static readonly T__80 = 81;
	public static readonly T__81 = 82;
	public static readonly T__82 = 83;
	public static readonly T__83 = 84;
	public static readonly T__84 = 85;
	public static readonly T__85 = 86;
	public static readonly T__86 = 87;
	public static readonly T__87 = 88;
	public static readonly T__88 = 89;
	public static readonly T__89 = 90;
	public static readonly T__90 = 91;
	public static readonly T__91 = 92;
	public static readonly T__92 = 93;
	public static readonly T__93 = 94;
	public static readonly T__94 = 95;
	public static readonly T__95 = 96;
	public static readonly T__96 = 97;
	public static readonly T__97 = 98;
	public static readonly T__98 = 99;
	public static readonly T__99 = 100;
	public static readonly T__100 = 101;
	public static readonly T__101 = 102;
	public static readonly T__102 = 103;
	public static readonly T__103 = 104;
	public static readonly T__104 = 105;
	public static readonly T__105 = 106;
	public static readonly T__106 = 107;
	public static readonly T__107 = 108;
	public static readonly T__108 = 109;
	public static readonly T__109 = 110;
	public static readonly T__110 = 111;
	public static readonly T__111 = 112;
	public static readonly T__112 = 113;
	public static readonly T__113 = 114;
	public static readonly T__114 = 115;
	public static readonly T__115 = 116;
	public static readonly T__116 = 117;
	public static readonly T__117 = 118;
	public static readonly T__118 = 119;
	public static readonly T__119 = 120;
	public static readonly T__120 = 121;
	public static readonly T__121 = 122;
	public static readonly T__122 = 123;
	public static readonly T__123 = 124;
	public static readonly T__124 = 125;
	public static readonly T__125 = 126;
	public static readonly T__126 = 127;
	public static readonly T__127 = 128;
	public static readonly T__128 = 129;
	public static readonly T__129 = 130;
	public static readonly T__130 = 131;
	public static readonly T__131 = 132;
	public static readonly T__132 = 133;
	public static readonly T__133 = 134;
	public static readonly T__134 = 135;
	public static readonly T__135 = 136;
	public static readonly T__136 = 137;
	public static readonly T__137 = 138;
	public static readonly T__138 = 139;
	public static readonly T__139 = 140;
	public static readonly T__140 = 141;
	public static readonly T__141 = 142;
	public static readonly T__142 = 143;
	public static readonly T__143 = 144;
	public static readonly T__144 = 145;
	public static readonly T__145 = 146;
	public static readonly T__146 = 147;
	public static readonly T__147 = 148;
	public static readonly T__148 = 149;
	public static readonly T__149 = 150;
	public static readonly T__150 = 151;
	public static readonly T__151 = 152;
	public static readonly T__152 = 153;
	public static readonly T__153 = 154;
	public static readonly T__154 = 155;
	public static readonly T__155 = 156;
	public static readonly PLACEHOLDER = 157;
	public static readonly QUOTEDIDENTIFIER = 158;
	public static readonly DATETIME = 159;
	public static readonly LONGNUMBER = 160;
	public static readonly DATE = 161;
	public static readonly TIME = 162;
	public static readonly IDENTIFIER = 163;
	public static readonly DELIMITEDIDENTIFIER = 164;
	public static readonly STRING = 165;
	public static readonly NUMBER = 166;
	public static readonly WS = 167;
	public static readonly COMMENT = 168;
	public static readonly LINE_COMMENT = 169;
	public static override readonly EOF = Token.EOF;
	public static readonly RULE_triccExpression = 0;
	public static readonly RULE_expression = 1;
	public static readonly RULE_expressionTerm = 2;
	public static readonly RULE_term = 3;
	public static readonly RULE_literal = 4;
	public static readonly RULE_definition = 5;
	public static readonly RULE_library = 6;
	public static readonly RULE_libraryDefinition = 7;
	public static readonly RULE_usingDefinition = 8;
	public static readonly RULE_includeDefinition = 9;
	public static readonly RULE_localIdentifier = 10;
	public static readonly RULE_accessModifier = 11;
	public static readonly RULE_parameterDefinition = 12;
	public static readonly RULE_codesystemDefinition = 13;
	public static readonly RULE_valuesetDefinition = 14;
	public static readonly RULE_codesystems = 15;
	public static readonly RULE_codesystemIdentifier = 16;
	public static readonly RULE_libraryIdentifier = 17;
	public static readonly RULE_codeDefinition = 18;
	public static readonly RULE_conceptDefinition = 19;
	public static readonly RULE_codeIdentifier = 20;
	public static readonly RULE_codesystemId = 21;
	public static readonly RULE_valuesetId = 22;
	public static readonly RULE_versionSpecifier = 23;
	public static readonly RULE_codeId = 24;
	public static readonly RULE_typeSpecifier = 25;
	public static readonly RULE_namedTypeSpecifier = 26;
	public static readonly RULE_modelIdentifier = 27;
	public static readonly RULE_listTypeSpecifier = 28;
	public static readonly RULE_intervalTypeSpecifier = 29;
	public static readonly RULE_tupleTypeSpecifier = 30;
	public static readonly RULE_tupleElementDefinition = 31;
	public static readonly RULE_choiceTypeSpecifier = 32;
	public static readonly RULE_statement = 33;
	public static readonly RULE_expressionDefinition = 34;
	public static readonly RULE_contextDefinition = 35;
	public static readonly RULE_fluentModifier = 36;
	public static readonly RULE_functionDefinition = 37;
	public static readonly RULE_operandDefinition = 38;
	public static readonly RULE_functionBody = 39;
	public static readonly RULE_querySource = 40;
	public static readonly RULE_aliasedQuerySource = 41;
	public static readonly RULE_alias = 42;
	public static readonly RULE_queryInclusionClause = 43;
	public static readonly RULE_withClause = 44;
	public static readonly RULE_withoutClause = 45;
	public static readonly RULE_retrieve = 46;
	public static readonly RULE_contextIdentifier = 47;
	public static readonly RULE_codePath = 48;
	public static readonly RULE_codeComparator = 49;
	public static readonly RULE_terminology = 50;
	public static readonly RULE_qualifier = 51;
	public static readonly RULE_query = 52;
	public static readonly RULE_sourceClause = 53;
	public static readonly RULE_letClause = 54;
	public static readonly RULE_letClauseItem = 55;
	public static readonly RULE_whereClause = 56;
	public static readonly RULE_returnClause = 57;
	public static readonly RULE_aggregateClause = 58;
	public static readonly RULE_startingClause = 59;
	public static readonly RULE_sortClause = 60;
	public static readonly RULE_sortDirection = 61;
	public static readonly RULE_sortByItem = 62;
	public static readonly RULE_qualifiedIdentifier = 63;
	public static readonly RULE_qualifiedIdentifierExpression = 64;
	public static readonly RULE_qualifierExpression = 65;
	public static readonly RULE_simplePath = 66;
	public static readonly RULE_simpleLiteral = 67;
	public static readonly RULE_dateTimePrecision = 68;
	public static readonly RULE_dateTimeComponent = 69;
	public static readonly RULE_pluralDateTimePrecision = 70;
	public static readonly RULE_caseExpressionItem = 71;
	public static readonly RULE_dateTimePrecisionSpecifier = 72;
	public static readonly RULE_relativeQualifier = 73;
	public static readonly RULE_offsetRelativeQualifier = 74;
	public static readonly RULE_exclusiveRelativeQualifier = 75;
	public static readonly RULE_quantityOffset = 76;
	public static readonly RULE_temporalRelationship = 77;
	public static readonly RULE_intervalOperatorPhrase = 78;
	public static readonly RULE_qualifiedInvocation = 79;
	public static readonly RULE_qualifiedFunction = 80;
	public static readonly RULE_invocation = 81;
	public static readonly RULE_function = 82;
	public static readonly RULE_ratio = 83;
	public static readonly RULE_externalConstant = 84;
	public static readonly RULE_intervalSelector = 85;
	public static readonly RULE_tupleSelector = 86;
	public static readonly RULE_tupleElementSelector = 87;
	public static readonly RULE_instanceSelector = 88;
	public static readonly RULE_instanceElementSelector = 89;
	public static readonly RULE_listSelector = 90;
	public static readonly RULE_displayClause = 91;
	public static readonly RULE_codeSelector = 92;
	public static readonly RULE_conceptSelector = 93;
	public static readonly RULE_keyword = 94;
	public static readonly RULE_reservedWord = 95;
	public static readonly RULE_keywordIdentifier = 96;
	public static readonly RULE_obsoleteIdentifier = 97;
	public static readonly RULE_functionIdentifier = 98;
	public static readonly RULE_typeNameIdentifier = 99;
	public static readonly RULE_referentialIdentifier = 100;
	public static readonly RULE_referentialOrTypeNameIdentifier = 101;
	public static readonly RULE_identifierOrFunctionIdentifier = 102;
	public static readonly RULE_identifier = 103;
	public static readonly RULE_paramList = 104;
	public static readonly RULE_quantity = 105;
	public static readonly RULE_unit = 106;
	public static readonly literalNames: (string | null)[] = [ null, "'is'", 
                                                            "'not'", "'null'", 
                                                            "'true'", "'false'", 
                                                            "'as'", "'cast'", 
                                                            "'exists'", 
                                                            "'properly'", 
                                                            "'between'", 
                                                            "'and'", "'<='", 
                                                            "'<'", "'>'", 
                                                            "'>='", "'='", 
                                                            "'!='", "'~'", 
                                                            "'!~'", "'in'", 
                                                            "'contains'", 
                                                            "'or'", "'xor'", 
                                                            "'implies'", 
                                                            "'convert'", 
                                                            "'to'", "'+'", 
                                                            "'-'", "'start'", 
                                                            "'end'", "'of'", 
                                                            "'from'", "'width'", 
                                                            "'successor'", 
                                                            "'predecessor'", 
                                                            "'singleton'", 
                                                            "'point'", "'minimum'", 
                                                            "'maximum'", 
                                                            "'^'", "'*'", 
                                                            "'/'", "'div'", 
                                                            "'mod'", "'&'", 
                                                            "'if'", "'then'", 
                                                            "'else'", "'case'", 
                                                            "'distinct'", 
                                                            "'flatten'", 
                                                            "'expand'", 
                                                            "'collapse'", 
                                                            "'per'", "'('", 
                                                            "')'", "'library'", 
                                                            "'version'", 
                                                            "'using'", "'called'", 
                                                            "'include'", 
                                                            "'public'", 
                                                            "'private'", 
                                                            "'parameter'", 
                                                            "'default'", 
                                                            "'codesystem'", 
                                                            "':'", "'valueset'", 
                                                            "'codesystems'", 
                                                            "'{'", "','", 
                                                            "'}'", "'.'", 
                                                            "'code'", "'concept'", 
                                                            "'List'", "'Interval'", 
                                                            "'Tuple'", "'Choice'", 
                                                            "'define'", 
                                                            "'context'", 
                                                            "'fluent'", 
                                                            "'function'", 
                                                            "'returns'", 
                                                            "'external'", 
                                                            "'with'", "'such that'", 
                                                            "'without'", 
                                                            "'['", "'->'", 
                                                            "']'", "'let'", 
                                                            "'where'", "'return'", 
                                                            "'all'", "'aggregate'", 
                                                            "'starting'", 
                                                            "'sort'", "'by'", 
                                                            "'asc'", "'ascending'", 
                                                            "'desc'", "'descending'", 
                                                            "'year'", "'month'", 
                                                            "'week'", "'day'", 
                                                            "'hour'", "'minute'", 
                                                            "'second'", 
                                                            "'millisecond'", 
                                                            "'date'", "'time'", 
                                                            "'timezone'", 
                                                            "'timezoneoffset'", 
                                                            "'years'", "'months'", 
                                                            "'weeks'", "'days'", 
                                                            "'hours'", "'minutes'", 
                                                            "'seconds'", 
                                                            "'milliseconds'", 
                                                            "'when'", "'or before'", 
                                                            "'or after'", 
                                                            "'or more'", 
                                                            "'or less'", 
                                                            "'less than'", 
                                                            "'more than'", 
                                                            "'on or'", "'before'", 
                                                            "'after'", "'or on'", 
                                                            "'starts'", 
                                                            "'ends'", "'occurs'", 
                                                            "'same'", "'includes'", 
                                                            "'during'", 
                                                            "'included in'", 
                                                            "'within'", 
                                                            "'meets'", "'overlaps'", 
                                                            "'$this'", "'$index'", 
                                                            "'$total'", 
                                                            "'%'", "'display'", 
                                                            "'Code'", "'Concept'", 
                                                            "'difference'", 
                                                            "'duration'", 
                                                            "'except'", 
                                                            "'intersect'", 
                                                            "'union'" ];
	public static readonly symbolicNames: (string | null)[] = [ null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, null, 
                                                             null, "PLACEHOLDER", 
                                                             "QUOTEDIDENTIFIER", 
                                                             "DATETIME", 
                                                             "LONGNUMBER", 
                                                             "DATE", "TIME", 
                                                             "IDENTIFIER", 
                                                             "DELIMITEDIDENTIFIER", 
                                                             "STRING", "NUMBER", 
                                                             "WS", "COMMENT", 
                                                             "LINE_COMMENT" ];
	// tslint:disable:no-trailing-whitespace
	public static readonly ruleNames: string[] = [
		"triccExpression", "expression", "expressionTerm", "term", "literal", 
		"definition", "library", "libraryDefinition", "usingDefinition", "includeDefinition", 
		"localIdentifier", "accessModifier", "parameterDefinition", "codesystemDefinition", 
		"valuesetDefinition", "codesystems", "codesystemIdentifier", "libraryIdentifier", 
		"codeDefinition", "conceptDefinition", "codeIdentifier", "codesystemId", 
		"valuesetId", "versionSpecifier", "codeId", "typeSpecifier", "namedTypeSpecifier", 
		"modelIdentifier", "listTypeSpecifier", "intervalTypeSpecifier", "tupleTypeSpecifier", 
		"tupleElementDefinition", "choiceTypeSpecifier", "statement", "expressionDefinition", 
		"contextDefinition", "fluentModifier", "functionDefinition", "operandDefinition", 
		"functionBody", "querySource", "aliasedQuerySource", "alias", "queryInclusionClause", 
		"withClause", "withoutClause", "retrieve", "contextIdentifier", "codePath", 
		"codeComparator", "terminology", "qualifier", "query", "sourceClause", 
		"letClause", "letClauseItem", "whereClause", "returnClause", "aggregateClause", 
		"startingClause", "sortClause", "sortDirection", "sortByItem", "qualifiedIdentifier", 
		"qualifiedIdentifierExpression", "qualifierExpression", "simplePath", 
		"simpleLiteral", "dateTimePrecision", "dateTimeComponent", "pluralDateTimePrecision", 
		"caseExpressionItem", "dateTimePrecisionSpecifier", "relativeQualifier", 
		"offsetRelativeQualifier", "exclusiveRelativeQualifier", "quantityOffset", 
		"temporalRelationship", "intervalOperatorPhrase", "qualifiedInvocation", 
		"qualifiedFunction", "invocation", "function", "ratio", "externalConstant", 
		"intervalSelector", "tupleSelector", "tupleElementSelector", "instanceSelector", 
		"instanceElementSelector", "listSelector", "displayClause", "codeSelector", 
		"conceptSelector", "keyword", "reservedWord", "keywordIdentifier", "obsoleteIdentifier", 
		"functionIdentifier", "typeNameIdentifier", "referentialIdentifier", "referentialOrTypeNameIdentifier", 
		"identifierOrFunctionIdentifier", "identifier", "paramList", "quantity", 
		"unit",
	];
	public get grammarFileName(): string { return "tricc_cql.g4"; }
	public get literalNames(): (string | null)[] { return tricc_cqlParser.literalNames; }
	public get symbolicNames(): (string | null)[] { return tricc_cqlParser.symbolicNames; }
	public get ruleNames(): string[] { return tricc_cqlParser.ruleNames; }
	public get serializedATN(): number[] { return tricc_cqlParser._serializedATN; }

	protected createFailedPredicateException(predicate?: string, message?: string): FailedPredicateException {
		return new FailedPredicateException(this, predicate, message);
	}

	constructor(input: TokenStream) {
		super(input);
		this._interp = new ParserATNSimulator(this, tricc_cqlParser._ATN, tricc_cqlParser.DecisionsToDFA, new PredictionContextCache());
	}
	// @RuleVersion(0)
	public triccExpression(): TriccExpressionContext {
		let localctx: TriccExpressionContext = new TriccExpressionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 0, tricc_cqlParser.RULE_triccExpression);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 214;
			this.expression(0);
			this.state = 215;
			this.match(tricc_cqlParser.EOF);
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

	public expression(): ExpressionContext;
	public expression(_p: number): ExpressionContext;
	// @RuleVersion(0)
	public expression(_p?: number): ExpressionContext {
		if (_p === undefined) {
			_p = 0;
		}

		let _parentctx: ParserRuleContext = this._ctx;
		let _parentState: number = this.state;
		let localctx: ExpressionContext = new ExpressionContext(this, this._ctx, _parentState);
		let _prevctx: ExpressionContext = localctx;
		let _startState: number = 2;
		this.enterRecursionRule(localctx, 2, tricc_cqlParser.RULE_expression, _p);
		let _la: number;
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 228;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 3:
			case 4:
			case 5:
			case 21:
			case 23:
			case 24:
			case 25:
			case 27:
			case 28:
			case 29:
			case 30:
			case 33:
			case 34:
			case 35:
			case 36:
			case 37:
			case 38:
			case 39:
			case 43:
			case 44:
			case 46:
			case 49:
			case 50:
			case 51:
			case 52:
			case 53:
			case 55:
			case 57:
			case 58:
			case 59:
			case 60:
			case 61:
			case 62:
			case 63:
			case 64:
			case 65:
			case 66:
			case 68:
			case 69:
			case 70:
			case 74:
			case 75:
			case 76:
			case 77:
			case 78:
			case 80:
			case 81:
			case 82:
			case 83:
			case 93:
			case 97:
			case 99:
			case 100:
			case 101:
			case 102:
			case 103:
			case 104:
			case 105:
			case 106:
			case 107:
			case 108:
			case 109:
			case 110:
			case 111:
			case 112:
			case 113:
			case 114:
			case 115:
			case 125:
			case 126:
			case 127:
			case 128:
			case 135:
			case 136:
			case 139:
			case 143:
			case 144:
			case 145:
			case 146:
			case 147:
			case 148:
			case 149:
			case 150:
			case 151:
			case 154:
			case 155:
			case 156:
			case 157:
			case 158:
			case 159:
			case 160:
			case 161:
			case 162:
			case 163:
			case 164:
			case 165:
			case 166:
				{
				localctx = new TermExpressionContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;

				this.state = 218;
				this.expressionTerm(0);
				}
				break;
			case 7:
				{
				localctx = new CastExpressionContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 219;
				this.match(tricc_cqlParser.T__6);
				this.state = 220;
				this.expression(0);
				this.state = 221;
				this.match(tricc_cqlParser.T__5);
				this.state = 222;
				this.typeSpecifier();
				}
				break;
			case 2:
				{
				localctx = new NotExpressionContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 224;
				this.match(tricc_cqlParser.T__1);
				this.state = 225;
				this.expression(11);
				}
				break;
			case 8:
				{
				localctx = new ExistenceExpressionContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 226;
				this.match(tricc_cqlParser.T__7);
				this.state = 227;
				this.expression(10);
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
			this._ctx.stop = this._input.LT(-1);
			this.state = 282;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 6, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					if (this._parseListeners != null) {
						this.triggerExitRuleEvent();
					}
					_prevctx = localctx;
					{
					this.state = 280;
					this._errHandler.sync(this);
					switch ( this._interp.adaptivePredict(this._input, 5, this._ctx) ) {
					case 1:
						{
						localctx = new InequalityExpressionContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, tricc_cqlParser.RULE_expression);
						this.state = 230;
						if (!(this.precpred(this._ctx, 8))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 8)");
						}
						this.state = 231;
						_la = this._input.LA(1);
						if(!((((_la) & ~0x1F) === 0 && ((1 << _la) & 61440) !== 0))) {
						this._errHandler.recoverInline(this);
						}
						else {
							this._errHandler.reportMatch(this);
						    this.consume();
						}
						this.state = 232;
						this.expression(9);
						}
						break;
					case 2:
						{
						localctx = new TimingExpressionContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, tricc_cqlParser.RULE_expression);
						this.state = 233;
						if (!(this.precpred(this._ctx, 7))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 7)");
						}
						this.state = 234;
						this.intervalOperatorPhrase();
						this.state = 235;
						this.expression(8);
						}
						break;
					case 3:
						{
						localctx = new EqualityExpressionContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, tricc_cqlParser.RULE_expression);
						this.state = 237;
						if (!(this.precpred(this._ctx, 6))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 6)");
						}
						this.state = 238;
						_la = this._input.LA(1);
						if(!((((_la) & ~0x1F) === 0 && ((1 << _la) & 983040) !== 0))) {
						this._errHandler.recoverInline(this);
						}
						else {
							this._errHandler.reportMatch(this);
						    this.consume();
						}
						this.state = 239;
						this.expression(7);
						}
						break;
					case 4:
						{
						localctx = new MembershipExpressionContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, tricc_cqlParser.RULE_expression);
						this.state = 240;
						if (!(this.precpred(this._ctx, 5))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 5)");
						}
						this.state = 241;
						_la = this._input.LA(1);
						if(!(_la===20 || _la===21)) {
						this._errHandler.recoverInline(this);
						}
						else {
							this._errHandler.reportMatch(this);
						    this.consume();
						}
						this.state = 243;
						this._errHandler.sync(this);
						switch ( this._interp.adaptivePredict(this._input, 1, this._ctx) ) {
						case 1:
							{
							this.state = 242;
							this.dateTimePrecisionSpecifier();
							}
							break;
						}
						this.state = 245;
						this.expression(6);
						}
						break;
					case 5:
						{
						localctx = new NegateMembershipExpressionContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, tricc_cqlParser.RULE_expression);
						this.state = 246;
						if (!(this.precpred(this._ctx, 4))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 4)");
						}
						this.state = 247;
						this.match(tricc_cqlParser.T__1);
						this.state = 248;
						_la = this._input.LA(1);
						if(!(_la===20 || _la===21)) {
						this._errHandler.recoverInline(this);
						}
						else {
							this._errHandler.reportMatch(this);
						    this.consume();
						}
						this.state = 250;
						this._errHandler.sync(this);
						switch ( this._interp.adaptivePredict(this._input, 2, this._ctx) ) {
						case 1:
							{
							this.state = 249;
							this.dateTimePrecisionSpecifier();
							}
							break;
						}
						this.state = 252;
						this.expression(5);
						}
						break;
					case 6:
						{
						localctx = new AndExpressionContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, tricc_cqlParser.RULE_expression);
						this.state = 253;
						if (!(this.precpred(this._ctx, 3))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 3)");
						}
						this.state = 254;
						this.match(tricc_cqlParser.T__10);
						this.state = 255;
						this.expression(4);
						}
						break;
					case 7:
						{
						localctx = new OrExpressionContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, tricc_cqlParser.RULE_expression);
						this.state = 256;
						if (!(this.precpred(this._ctx, 2))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 2)");
						}
						this.state = 257;
						_la = this._input.LA(1);
						if(!(_la===22 || _la===23)) {
						this._errHandler.recoverInline(this);
						}
						else {
							this._errHandler.reportMatch(this);
						    this.consume();
						}
						this.state = 258;
						this.expression(3);
						}
						break;
					case 8:
						{
						localctx = new ImpliesExpressionContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, tricc_cqlParser.RULE_expression);
						this.state = 259;
						if (!(this.precpred(this._ctx, 1))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 1)");
						}
						this.state = 260;
						this.match(tricc_cqlParser.T__23);
						this.state = 261;
						this.expression(2);
						}
						break;
					case 9:
						{
						localctx = new BooleanExpressionContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, tricc_cqlParser.RULE_expression);
						this.state = 262;
						if (!(this.precpred(this._ctx, 14))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 14)");
						}
						this.state = 263;
						this.match(tricc_cqlParser.T__0);
						this.state = 265;
						this._errHandler.sync(this);
						_la = this._input.LA(1);
						if (_la===2) {
							{
							this.state = 264;
							this.match(tricc_cqlParser.T__1);
							}
						}

						this.state = 267;
						_la = this._input.LA(1);
						if(!((((_la) & ~0x1F) === 0 && ((1 << _la) & 56) !== 0))) {
						this._errHandler.recoverInline(this);
						}
						else {
							this._errHandler.reportMatch(this);
						    this.consume();
						}
						}
						break;
					case 10:
						{
						localctx = new TypeExpressionContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, tricc_cqlParser.RULE_expression);
						this.state = 268;
						if (!(this.precpred(this._ctx, 13))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 13)");
						}
						this.state = 269;
						_la = this._input.LA(1);
						if(!(_la===1 || _la===6)) {
						this._errHandler.recoverInline(this);
						}
						else {
							this._errHandler.reportMatch(this);
						    this.consume();
						}
						this.state = 270;
						this.typeSpecifier();
						}
						break;
					case 11:
						{
						localctx = new BetweenExpressionContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, tricc_cqlParser.RULE_expression);
						this.state = 271;
						if (!(this.precpred(this._ctx, 9))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 9)");
						}
						this.state = 273;
						this._errHandler.sync(this);
						_la = this._input.LA(1);
						if (_la===9) {
							{
							this.state = 272;
							this.match(tricc_cqlParser.T__8);
							}
						}

						this.state = 275;
						this.match(tricc_cqlParser.T__9);
						this.state = 276;
						this.expressionTerm(0);
						this.state = 277;
						this.match(tricc_cqlParser.T__10);
						this.state = 278;
						this.expressionTerm(0);
						}
						break;
					}
					}
				}
				this.state = 284;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 6, this._ctx);
			}
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
			this.unrollRecursionContexts(_parentctx);
		}
		return localctx;
	}

	public expressionTerm(): ExpressionTermContext;
	public expressionTerm(_p: number): ExpressionTermContext;
	// @RuleVersion(0)
	public expressionTerm(_p?: number): ExpressionTermContext {
		if (_p === undefined) {
			_p = 0;
		}

		let _parentctx: ParserRuleContext = this._ctx;
		let _parentState: number = this.state;
		let localctx: ExpressionTermContext = new ExpressionTermContext(this, this._ctx, _parentState);
		let _prevctx: ExpressionTermContext = localctx;
		let _startState: number = 4;
		this.enterRecursionRule(localctx, 4, tricc_cqlParser.RULE_expressionTerm, _p);
		let _la: number;
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 351;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 12, this._ctx) ) {
			case 1:
				{
				localctx = new TermExpressionTermContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;

				this.state = 286;
				this.term();
				}
				break;
			case 2:
				{
				localctx = new ConversionExpressionTermContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 287;
				this.match(tricc_cqlParser.T__24);
				this.state = 288;
				this.expression(0);
				this.state = 289;
				this.match(tricc_cqlParser.T__25);
				this.state = 292;
				this._errHandler.sync(this);
				switch (this._input.LA(1)) {
				case 21:
				case 23:
				case 24:
				case 29:
				case 30:
				case 33:
				case 34:
				case 35:
				case 43:
				case 44:
				case 57:
				case 58:
				case 59:
				case 60:
				case 61:
				case 62:
				case 63:
				case 64:
				case 65:
				case 66:
				case 68:
				case 69:
				case 74:
				case 75:
				case 76:
				case 77:
				case 78:
				case 79:
				case 80:
				case 81:
				case 82:
				case 83:
				case 93:
				case 97:
				case 99:
				case 100:
				case 101:
				case 102:
				case 103:
				case 112:
				case 113:
				case 114:
				case 115:
				case 125:
				case 126:
				case 127:
				case 128:
				case 135:
				case 136:
				case 139:
				case 143:
				case 144:
				case 149:
				case 150:
				case 151:
				case 154:
				case 155:
				case 156:
				case 158:
				case 163:
				case 164:
					{
					this.state = 290;
					this.typeSpecifier();
					}
					break;
				case 104:
				case 105:
				case 106:
				case 107:
				case 108:
				case 109:
				case 110:
				case 111:
				case 116:
				case 117:
				case 118:
				case 119:
				case 120:
				case 121:
				case 122:
				case 123:
				case 165:
					{
					this.state = 291;
					this.unit();
					}
					break;
				default:
					throw new NoViableAltException(this);
				}
				}
				break;
			case 3:
				{
				localctx = new PolarityExpressionTermContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 294;
				_la = this._input.LA(1);
				if(!(_la===27 || _la===28)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				this.state = 295;
				this.expressionTerm(16);
				}
				break;
			case 4:
				{
				localctx = new TimeBoundaryExpressionTermContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 296;
				_la = this._input.LA(1);
				if(!(_la===29 || _la===30)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				this.state = 297;
				this.match(tricc_cqlParser.T__30);
				this.state = 298;
				this.expressionTerm(15);
				}
				break;
			case 5:
				{
				localctx = new TimeUnitExpressionTermContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 299;
				this.dateTimeComponent();
				this.state = 300;
				this.match(tricc_cqlParser.T__31);
				this.state = 301;
				this.expressionTerm(14);
				}
				break;
			case 6:
				{
				localctx = new WidthExpressionTermContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 303;
				this.match(tricc_cqlParser.T__32);
				this.state = 304;
				this.match(tricc_cqlParser.T__30);
				this.state = 305;
				this.expressionTerm(13);
				}
				break;
			case 7:
				{
				localctx = new SuccessorExpressionTermContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 306;
				this.match(tricc_cqlParser.T__33);
				this.state = 307;
				this.match(tricc_cqlParser.T__30);
				this.state = 308;
				this.expressionTerm(12);
				}
				break;
			case 8:
				{
				localctx = new PredecessorExpressionTermContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 309;
				this.match(tricc_cqlParser.T__34);
				this.state = 310;
				this.match(tricc_cqlParser.T__30);
				this.state = 311;
				this.expressionTerm(11);
				}
				break;
			case 9:
				{
				localctx = new ElementExtractorExpressionTermContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 312;
				this.match(tricc_cqlParser.T__35);
				this.state = 313;
				this.match(tricc_cqlParser.T__31);
				this.state = 314;
				this.expressionTerm(10);
				}
				break;
			case 10:
				{
				localctx = new PointExtractorExpressionTermContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 315;
				this.match(tricc_cqlParser.T__36);
				this.state = 316;
				this.match(tricc_cqlParser.T__31);
				this.state = 317;
				this.expressionTerm(9);
				}
				break;
			case 11:
				{
				localctx = new TypeExtentExpressionTermContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 318;
				_la = this._input.LA(1);
				if(!(_la===38 || _la===39)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				this.state = 319;
				this.namedTypeSpecifier();
				}
				break;
			case 12:
				{
				localctx = new IfThenElseExpressionTermContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 320;
				this.match(tricc_cqlParser.T__45);
				this.state = 321;
				this.expression(0);
				this.state = 322;
				this.match(tricc_cqlParser.T__46);
				this.state = 323;
				this.expression(0);
				this.state = 324;
				this.match(tricc_cqlParser.T__47);
				this.state = 325;
				this.expression(0);
				}
				break;
			case 13:
				{
				localctx = new CaseExpressionTermContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 327;
				this.match(tricc_cqlParser.T__48);
				this.state = 329;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if ((((_la) & ~0x1F) === 0 && ((1 << _la) & 2074083772) !== 0) || ((((_la - 33)) & ~0x1F) === 0 && ((1 << (_la - 33)) & 4284427391) !== 0) || ((((_la - 65)) & ~0x1F) === 0 && ((1 << (_la - 65)) & 268942907) !== 0) || ((((_la - 97)) & ~0x1F) === 0 && ((1 << (_la - 97)) & 4027056125) !== 0) || ((((_la - 135)) & ~0x1F) === 0 && ((1 << (_la - 135)) & 4294573843) !== 0)) {
					{
					this.state = 328;
					this.expression(0);
					}
				}

				this.state = 332;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				do {
					{
					{
					this.state = 331;
					this.caseExpressionItem();
					}
					}
					this.state = 334;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				} while (_la===124);
				this.state = 336;
				this.match(tricc_cqlParser.T__47);
				this.state = 337;
				this.expression(0);
				this.state = 338;
				this.match(tricc_cqlParser.T__29);
				}
				break;
			case 14:
				{
				localctx = new AggregateExpressionTermContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 340;
				_la = this._input.LA(1);
				if(!(_la===50 || _la===51)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				this.state = 341;
				this.expression(0);
				}
				break;
			case 15:
				{
				localctx = new SetAggregateExpressionTermContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 342;
				_la = this._input.LA(1);
				if(!(_la===52 || _la===53)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				this.state = 343;
				this.expression(0);
				this.state = 349;
				this._errHandler.sync(this);
				switch ( this._interp.adaptivePredict(this._input, 11, this._ctx) ) {
				case 1:
					{
					this.state = 344;
					this.match(tricc_cqlParser.T__53);
					this.state = 347;
					this._errHandler.sync(this);
					switch ( this._interp.adaptivePredict(this._input, 10, this._ctx) ) {
					case 1:
						{
						this.state = 345;
						this.dateTimePrecision();
						}
						break;
					case 2:
						{
						this.state = 346;
						this.expression(0);
						}
						break;
					}
					}
					break;
				}
				}
				break;
			}
			this._ctx.stop = this._input.LT(-1);
			this.state = 364;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 14, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					if (this._parseListeners != null) {
						this.triggerExitRuleEvent();
					}
					_prevctx = localctx;
					{
					this.state = 362;
					this._errHandler.sync(this);
					switch ( this._interp.adaptivePredict(this._input, 13, this._ctx) ) {
					case 1:
						{
						localctx = new PowerExpressionTermContext(this, new ExpressionTermContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, tricc_cqlParser.RULE_expressionTerm);
						this.state = 353;
						if (!(this.precpred(this._ctx, 7))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 7)");
						}
						this.state = 354;
						this.match(tricc_cqlParser.T__39);
						this.state = 355;
						this.expressionTerm(8);
						}
						break;
					case 2:
						{
						localctx = new MultiplicationExpressionTermContext(this, new ExpressionTermContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, tricc_cqlParser.RULE_expressionTerm);
						this.state = 356;
						if (!(this.precpred(this._ctx, 6))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 6)");
						}
						this.state = 357;
						_la = this._input.LA(1);
						if(!(((((_la - 41)) & ~0x1F) === 0 && ((1 << (_la - 41)) & 15) !== 0))) {
						this._errHandler.recoverInline(this);
						}
						else {
							this._errHandler.reportMatch(this);
						    this.consume();
						}
						this.state = 358;
						this.expressionTerm(7);
						}
						break;
					case 3:
						{
						localctx = new AdditionExpressionTermContext(this, new ExpressionTermContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, tricc_cqlParser.RULE_expressionTerm);
						this.state = 359;
						if (!(this.precpred(this._ctx, 5))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 5)");
						}
						this.state = 360;
						_la = this._input.LA(1);
						if(!(((((_la - 27)) & ~0x1F) === 0 && ((1 << (_la - 27)) & 262147) !== 0))) {
						this._errHandler.recoverInline(this);
						}
						else {
							this._errHandler.reportMatch(this);
						    this.consume();
						}
						this.state = 361;
						this.expressionTerm(6);
						}
						break;
					}
					}
				}
				this.state = 366;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 14, this._ctx);
			}
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
			this.unrollRecursionContexts(_parentctx);
		}
		return localctx;
	}
	// @RuleVersion(0)
	public term(): TermContext {
		let localctx: TermContext = new TermContext(this, this._ctx, this.state);
		this.enterRule(localctx, 6, tricc_cqlParser.RULE_term);
		try {
			this.state = 381;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 15, this._ctx) ) {
			case 1:
				localctx = new InvocationTermContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 367;
				this.invocation();
				}
				break;
			case 2:
				localctx = new LiteralTermContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 368;
				this.literal();
				}
				break;
			case 3:
				localctx = new ExternalConstantTermContext(this, localctx);
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 369;
				this.externalConstant();
				}
				break;
			case 4:
				localctx = new IntervalSelectorTermContext(this, localctx);
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 370;
				this.intervalSelector();
				}
				break;
			case 5:
				localctx = new TupleSelectorTermContext(this, localctx);
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 371;
				this.tupleSelector();
				}
				break;
			case 6:
				localctx = new InstanceSelectorTermContext(this, localctx);
				this.enterOuterAlt(localctx, 6);
				{
				this.state = 372;
				this.instanceSelector();
				}
				break;
			case 7:
				localctx = new ListSelectorTermContext(this, localctx);
				this.enterOuterAlt(localctx, 7);
				{
				this.state = 373;
				this.listSelector();
				}
				break;
			case 8:
				localctx = new CodeSelectorTermContext(this, localctx);
				this.enterOuterAlt(localctx, 8);
				{
				this.state = 374;
				this.codeSelector();
				}
				break;
			case 9:
				localctx = new ConceptSelectorTermContext(this, localctx);
				this.enterOuterAlt(localctx, 9);
				{
				this.state = 375;
				this.conceptSelector();
				}
				break;
			case 10:
				localctx = new ParenthesizedTermContext(this, localctx);
				this.enterOuterAlt(localctx, 10);
				{
				this.state = 376;
				this.match(tricc_cqlParser.T__54);
				this.state = 377;
				this.expression(0);
				this.state = 378;
				this.match(tricc_cqlParser.T__55);
				}
				break;
			case 11:
				localctx = new PlaceholderTermContext(this, localctx);
				this.enterOuterAlt(localctx, 11);
				{
				this.state = 380;
				this.match(tricc_cqlParser.PLACEHOLDER);
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
	public literal(): LiteralContext {
		let localctx: LiteralContext = new LiteralContext(this, this._ctx, this.state);
		this.enterRule(localctx, 8, tricc_cqlParser.RULE_literal);
		let _la: number;
		try {
			this.state = 391;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 4:
			case 5:
				localctx = new BooleanLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 383;
				_la = this._input.LA(1);
				if(!(_la===4 || _la===5)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				}
				break;
			case 3:
				localctx = new NullLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 384;
				this.match(tricc_cqlParser.T__2);
				}
				break;
			case 165:
				localctx = new StringLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 385;
				this.match(tricc_cqlParser.STRING);
				}
				break;
			case 166:
				localctx = new NumberLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 386;
				this.match(tricc_cqlParser.NUMBER);
				}
				break;
			case 160:
				localctx = new LongNumberLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 387;
				this.match(tricc_cqlParser.LONGNUMBER);
				}
				break;
			case 159:
				localctx = new DateTimeLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 6);
				{
				this.state = 388;
				this.match(tricc_cqlParser.DATETIME);
				}
				break;
			case 161:
				localctx = new DateLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 7);
				{
				this.state = 389;
				this.match(tricc_cqlParser.DATE);
				}
				break;
			case 162:
				localctx = new TimeLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 8);
				{
				this.state = 390;
				this.match(tricc_cqlParser.TIME);
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
	public definition(): DefinitionContext {
		let localctx: DefinitionContext = new DefinitionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 10, tricc_cqlParser.RULE_definition);
		try {
			this.state = 400;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 17, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 393;
				this.usingDefinition();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 394;
				this.includeDefinition();
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 395;
				this.codesystemDefinition();
				}
				break;
			case 4:
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 396;
				this.valuesetDefinition();
				}
				break;
			case 5:
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 397;
				this.codeDefinition();
				}
				break;
			case 6:
				this.enterOuterAlt(localctx, 6);
				{
				this.state = 398;
				this.conceptDefinition();
				}
				break;
			case 7:
				this.enterOuterAlt(localctx, 7);
				{
				this.state = 399;
				this.parameterDefinition();
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
	public library(): LibraryContext {
		let localctx: LibraryContext = new LibraryContext(this, this._ctx, this.state);
		this.enterRule(localctx, 12, tricc_cqlParser.RULE_library);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 403;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===57) {
				{
				this.state = 402;
				this.libraryDefinition();
				}
			}

			this.state = 408;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (((((_la - 59)) & ~0x1F) === 0 && ((1 << (_la - 59)) & 99005) !== 0)) {
				{
				{
				this.state = 405;
				this.definition();
				}
				}
				this.state = 410;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			this.state = 414;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===80 || _la===81) {
				{
				{
				this.state = 411;
				this.statement();
				}
				}
				this.state = 416;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			this.state = 417;
			this.match(tricc_cqlParser.EOF);
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
	public libraryDefinition(): LibraryDefinitionContext {
		let localctx: LibraryDefinitionContext = new LibraryDefinitionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 14, tricc_cqlParser.RULE_libraryDefinition);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 419;
			this.match(tricc_cqlParser.T__56);
			this.state = 420;
			this.qualifiedIdentifier();
			this.state = 423;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===58) {
				{
				this.state = 421;
				this.match(tricc_cqlParser.T__57);
				this.state = 422;
				this.versionSpecifier();
				}
			}

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
	public usingDefinition(): UsingDefinitionContext {
		let localctx: UsingDefinitionContext = new UsingDefinitionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 16, tricc_cqlParser.RULE_usingDefinition);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 425;
			this.match(tricc_cqlParser.T__58);
			this.state = 426;
			this.qualifiedIdentifier();
			this.state = 429;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===58) {
				{
				this.state = 427;
				this.match(tricc_cqlParser.T__57);
				this.state = 428;
				this.versionSpecifier();
				}
			}

			this.state = 433;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===60) {
				{
				this.state = 431;
				this.match(tricc_cqlParser.T__59);
				this.state = 432;
				this.localIdentifier();
				}
			}

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
	public includeDefinition(): IncludeDefinitionContext {
		let localctx: IncludeDefinitionContext = new IncludeDefinitionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 18, tricc_cqlParser.RULE_includeDefinition);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 435;
			this.match(tricc_cqlParser.T__60);
			this.state = 436;
			this.qualifiedIdentifier();
			this.state = 439;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===58) {
				{
				this.state = 437;
				this.match(tricc_cqlParser.T__57);
				this.state = 438;
				this.versionSpecifier();
				}
			}

			this.state = 443;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===60) {
				{
				this.state = 441;
				this.match(tricc_cqlParser.T__59);
				this.state = 442;
				this.localIdentifier();
				}
			}

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
	public localIdentifier(): LocalIdentifierContext {
		let localctx: LocalIdentifierContext = new LocalIdentifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 20, tricc_cqlParser.RULE_localIdentifier);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 445;
			this.identifier();
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
	public accessModifier(): AccessModifierContext {
		let localctx: AccessModifierContext = new AccessModifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 22, tricc_cqlParser.RULE_accessModifier);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 447;
			_la = this._input.LA(1);
			if(!(_la===62 || _la===63)) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
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
	public parameterDefinition(): ParameterDefinitionContext {
		let localctx: ParameterDefinitionContext = new ParameterDefinitionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 24, tricc_cqlParser.RULE_parameterDefinition);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 450;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===62 || _la===63) {
				{
				this.state = 449;
				this.accessModifier();
				}
			}

			this.state = 452;
			this.match(tricc_cqlParser.T__63);
			this.state = 453;
			this.identifier();
			this.state = 455;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 27, this._ctx) ) {
			case 1:
				{
				this.state = 454;
				this.typeSpecifier();
				}
				break;
			}
			this.state = 459;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===65) {
				{
				this.state = 457;
				this.match(tricc_cqlParser.T__64);
				this.state = 458;
				this.expression(0);
				}
			}

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
	public codesystemDefinition(): CodesystemDefinitionContext {
		let localctx: CodesystemDefinitionContext = new CodesystemDefinitionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 26, tricc_cqlParser.RULE_codesystemDefinition);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 462;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===62 || _la===63) {
				{
				this.state = 461;
				this.accessModifier();
				}
			}

			this.state = 464;
			this.match(tricc_cqlParser.T__65);
			this.state = 465;
			this.identifier();
			this.state = 466;
			this.match(tricc_cqlParser.T__66);
			this.state = 467;
			this.codesystemId();
			this.state = 470;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===58) {
				{
				this.state = 468;
				this.match(tricc_cqlParser.T__57);
				this.state = 469;
				this.versionSpecifier();
				}
			}

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
	public valuesetDefinition(): ValuesetDefinitionContext {
		let localctx: ValuesetDefinitionContext = new ValuesetDefinitionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 28, tricc_cqlParser.RULE_valuesetDefinition);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 473;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===62 || _la===63) {
				{
				this.state = 472;
				this.accessModifier();
				}
			}

			this.state = 475;
			this.match(tricc_cqlParser.T__67);
			this.state = 476;
			this.identifier();
			this.state = 477;
			this.match(tricc_cqlParser.T__66);
			this.state = 478;
			this.valuesetId();
			this.state = 481;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===58) {
				{
				this.state = 479;
				this.match(tricc_cqlParser.T__57);
				this.state = 480;
				this.versionSpecifier();
				}
			}

			this.state = 484;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===69) {
				{
				this.state = 483;
				this.codesystems();
				}
			}

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
	public codesystems(): CodesystemsContext {
		let localctx: CodesystemsContext = new CodesystemsContext(this, this._ctx, this.state);
		this.enterRule(localctx, 30, tricc_cqlParser.RULE_codesystems);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 486;
			this.match(tricc_cqlParser.T__68);
			this.state = 487;
			this.match(tricc_cqlParser.T__69);
			this.state = 488;
			this.codesystemIdentifier();
			this.state = 493;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===71) {
				{
				{
				this.state = 489;
				this.match(tricc_cqlParser.T__70);
				this.state = 490;
				this.codesystemIdentifier();
				}
				}
				this.state = 495;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			this.state = 496;
			this.match(tricc_cqlParser.T__71);
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
	public codesystemIdentifier(): CodesystemIdentifierContext {
		let localctx: CodesystemIdentifierContext = new CodesystemIdentifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 32, tricc_cqlParser.RULE_codesystemIdentifier);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 501;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 35, this._ctx) ) {
			case 1:
				{
				this.state = 498;
				this.libraryIdentifier();
				this.state = 499;
				this.match(tricc_cqlParser.T__72);
				}
				break;
			}
			this.state = 503;
			this.identifier();
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
	public libraryIdentifier(): LibraryIdentifierContext {
		let localctx: LibraryIdentifierContext = new LibraryIdentifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 34, tricc_cqlParser.RULE_libraryIdentifier);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 505;
			this.identifier();
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
	public codeDefinition(): CodeDefinitionContext {
		let localctx: CodeDefinitionContext = new CodeDefinitionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 36, tricc_cqlParser.RULE_codeDefinition);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 508;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===62 || _la===63) {
				{
				this.state = 507;
				this.accessModifier();
				}
			}

			this.state = 510;
			this.match(tricc_cqlParser.T__73);
			this.state = 511;
			this.identifier();
			this.state = 512;
			this.match(tricc_cqlParser.T__66);
			this.state = 513;
			this.codeId();
			this.state = 514;
			this.match(tricc_cqlParser.T__31);
			this.state = 515;
			this.codesystemIdentifier();
			this.state = 517;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===149) {
				{
				this.state = 516;
				this.displayClause();
				}
			}

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
	public conceptDefinition(): ConceptDefinitionContext {
		let localctx: ConceptDefinitionContext = new ConceptDefinitionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 38, tricc_cqlParser.RULE_conceptDefinition);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 520;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===62 || _la===63) {
				{
				this.state = 519;
				this.accessModifier();
				}
			}

			this.state = 522;
			this.match(tricc_cqlParser.T__74);
			this.state = 523;
			this.identifier();
			this.state = 524;
			this.match(tricc_cqlParser.T__66);
			this.state = 525;
			this.match(tricc_cqlParser.T__69);
			this.state = 526;
			this.codeIdentifier();
			this.state = 531;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===71) {
				{
				{
				this.state = 527;
				this.match(tricc_cqlParser.T__70);
				this.state = 528;
				this.codeIdentifier();
				}
				}
				this.state = 533;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			this.state = 534;
			this.match(tricc_cqlParser.T__71);
			this.state = 536;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===149) {
				{
				this.state = 535;
				this.displayClause();
				}
			}

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
	public codeIdentifier(): CodeIdentifierContext {
		let localctx: CodeIdentifierContext = new CodeIdentifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 40, tricc_cqlParser.RULE_codeIdentifier);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 541;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 41, this._ctx) ) {
			case 1:
				{
				this.state = 538;
				this.libraryIdentifier();
				this.state = 539;
				this.match(tricc_cqlParser.T__72);
				}
				break;
			}
			this.state = 543;
			this.identifier();
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
	public codesystemId(): CodesystemIdContext {
		let localctx: CodesystemIdContext = new CodesystemIdContext(this, this._ctx, this.state);
		this.enterRule(localctx, 42, tricc_cqlParser.RULE_codesystemId);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 545;
			this.match(tricc_cqlParser.STRING);
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
	public valuesetId(): ValuesetIdContext {
		let localctx: ValuesetIdContext = new ValuesetIdContext(this, this._ctx, this.state);
		this.enterRule(localctx, 44, tricc_cqlParser.RULE_valuesetId);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 547;
			this.match(tricc_cqlParser.STRING);
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
	public versionSpecifier(): VersionSpecifierContext {
		let localctx: VersionSpecifierContext = new VersionSpecifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 46, tricc_cqlParser.RULE_versionSpecifier);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 549;
			this.match(tricc_cqlParser.STRING);
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
	public codeId(): CodeIdContext {
		let localctx: CodeIdContext = new CodeIdContext(this, this._ctx, this.state);
		this.enterRule(localctx, 48, tricc_cqlParser.RULE_codeId);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 551;
			this.match(tricc_cqlParser.STRING);
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
	public typeSpecifier(): TypeSpecifierContext {
		let localctx: TypeSpecifierContext = new TypeSpecifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 50, tricc_cqlParser.RULE_typeSpecifier);
		try {
			this.state = 558;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 21:
			case 23:
			case 24:
			case 29:
			case 30:
			case 33:
			case 34:
			case 35:
			case 43:
			case 44:
			case 57:
			case 58:
			case 59:
			case 60:
			case 61:
			case 62:
			case 63:
			case 64:
			case 65:
			case 66:
			case 68:
			case 69:
			case 74:
			case 75:
			case 80:
			case 81:
			case 82:
			case 83:
			case 93:
			case 97:
			case 99:
			case 100:
			case 101:
			case 102:
			case 103:
			case 112:
			case 113:
			case 114:
			case 115:
			case 125:
			case 126:
			case 127:
			case 128:
			case 135:
			case 136:
			case 139:
			case 143:
			case 144:
			case 149:
			case 150:
			case 151:
			case 154:
			case 155:
			case 156:
			case 158:
			case 163:
			case 164:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 553;
				this.namedTypeSpecifier();
				}
				break;
			case 76:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 554;
				this.listTypeSpecifier();
				}
				break;
			case 77:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 555;
				this.intervalTypeSpecifier();
				}
				break;
			case 78:
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 556;
				this.tupleTypeSpecifier();
				}
				break;
			case 79:
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 557;
				this.choiceTypeSpecifier();
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
	public namedTypeSpecifier(): NamedTypeSpecifierContext {
		let localctx: NamedTypeSpecifierContext = new NamedTypeSpecifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 52, tricc_cqlParser.RULE_namedTypeSpecifier);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 565;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 43, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 560;
					this.qualifier();
					this.state = 561;
					this.match(tricc_cqlParser.T__72);
					}
					}
				}
				this.state = 567;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 43, this._ctx);
			}
			this.state = 568;
			this.referentialOrTypeNameIdentifier();
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
	public modelIdentifier(): ModelIdentifierContext {
		let localctx: ModelIdentifierContext = new ModelIdentifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 54, tricc_cqlParser.RULE_modelIdentifier);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 570;
			this.identifier();
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
	public listTypeSpecifier(): ListTypeSpecifierContext {
		let localctx: ListTypeSpecifierContext = new ListTypeSpecifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 56, tricc_cqlParser.RULE_listTypeSpecifier);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 572;
			this.match(tricc_cqlParser.T__75);
			this.state = 573;
			this.match(tricc_cqlParser.T__12);
			this.state = 574;
			this.typeSpecifier();
			this.state = 575;
			this.match(tricc_cqlParser.T__13);
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
	public intervalTypeSpecifier(): IntervalTypeSpecifierContext {
		let localctx: IntervalTypeSpecifierContext = new IntervalTypeSpecifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 58, tricc_cqlParser.RULE_intervalTypeSpecifier);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 577;
			this.match(tricc_cqlParser.T__76);
			this.state = 578;
			this.match(tricc_cqlParser.T__12);
			this.state = 579;
			this.typeSpecifier();
			this.state = 580;
			this.match(tricc_cqlParser.T__13);
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
	public tupleTypeSpecifier(): TupleTypeSpecifierContext {
		let localctx: TupleTypeSpecifierContext = new TupleTypeSpecifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 60, tricc_cqlParser.RULE_tupleTypeSpecifier);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 582;
			this.match(tricc_cqlParser.T__77);
			this.state = 583;
			this.match(tricc_cqlParser.T__69);
			this.state = 584;
			this.tupleElementDefinition();
			this.state = 589;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===71) {
				{
				{
				this.state = 585;
				this.match(tricc_cqlParser.T__70);
				this.state = 586;
				this.tupleElementDefinition();
				}
				}
				this.state = 591;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			this.state = 592;
			this.match(tricc_cqlParser.T__71);
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
	public tupleElementDefinition(): TupleElementDefinitionContext {
		let localctx: TupleElementDefinitionContext = new TupleElementDefinitionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 62, tricc_cqlParser.RULE_tupleElementDefinition);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 594;
			this.referentialIdentifier();
			this.state = 595;
			this.typeSpecifier();
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
	public choiceTypeSpecifier(): ChoiceTypeSpecifierContext {
		let localctx: ChoiceTypeSpecifierContext = new ChoiceTypeSpecifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 64, tricc_cqlParser.RULE_choiceTypeSpecifier);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 597;
			this.match(tricc_cqlParser.T__78);
			this.state = 598;
			this.match(tricc_cqlParser.T__12);
			this.state = 599;
			this.typeSpecifier();
			this.state = 604;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===71) {
				{
				{
				this.state = 600;
				this.match(tricc_cqlParser.T__70);
				this.state = 601;
				this.typeSpecifier();
				}
				}
				this.state = 606;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			this.state = 607;
			this.match(tricc_cqlParser.T__13);
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
	public statement(): StatementContext {
		let localctx: StatementContext = new StatementContext(this, this._ctx, this.state);
		this.enterRule(localctx, 66, tricc_cqlParser.RULE_statement);
		try {
			this.state = 612;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 46, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 609;
				this.expressionDefinition();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 610;
				this.contextDefinition();
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 611;
				this.functionDefinition();
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
	public expressionDefinition(): ExpressionDefinitionContext {
		let localctx: ExpressionDefinitionContext = new ExpressionDefinitionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 68, tricc_cqlParser.RULE_expressionDefinition);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 614;
			this.match(tricc_cqlParser.T__79);
			this.state = 616;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===62 || _la===63) {
				{
				this.state = 615;
				this.accessModifier();
				}
			}

			this.state = 618;
			this.identifier();
			this.state = 619;
			this.match(tricc_cqlParser.T__66);
			this.state = 620;
			this.expression(0);
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
	public contextDefinition(): ContextDefinitionContext {
		let localctx: ContextDefinitionContext = new ContextDefinitionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 70, tricc_cqlParser.RULE_contextDefinition);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 622;
			this.match(tricc_cqlParser.T__80);
			this.state = 626;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 48, this._ctx) ) {
			case 1:
				{
				this.state = 623;
				this.modelIdentifier();
				this.state = 624;
				this.match(tricc_cqlParser.T__72);
				}
				break;
			}
			this.state = 628;
			this.identifier();
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
	public fluentModifier(): FluentModifierContext {
		let localctx: FluentModifierContext = new FluentModifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 72, tricc_cqlParser.RULE_fluentModifier);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 630;
			this.match(tricc_cqlParser.T__81);
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
	public functionDefinition(): FunctionDefinitionContext {
		let localctx: FunctionDefinitionContext = new FunctionDefinitionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 74, tricc_cqlParser.RULE_functionDefinition);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 632;
			this.match(tricc_cqlParser.T__79);
			this.state = 634;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===62 || _la===63) {
				{
				this.state = 633;
				this.accessModifier();
				}
			}

			this.state = 637;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===82) {
				{
				this.state = 636;
				this.fluentModifier();
				}
			}

			this.state = 639;
			this.match(tricc_cqlParser.T__82);
			this.state = 640;
			this.identifierOrFunctionIdentifier();
			this.state = 641;
			this.match(tricc_cqlParser.T__54);
			this.state = 650;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if ((((_la) & ~0x1F) === 0 && ((1 << _la) & 1637875712) !== 0) || ((((_la - 33)) & ~0x1F) === 0 && ((1 << (_la - 33)) & 4278193159) !== 0) || ((((_la - 65)) & ~0x1F) === 0 && ((1 << (_la - 65)) & 268928539) !== 0) || ((((_la - 97)) & ~0x1F) === 0 && ((1 << (_la - 97)) & 4027023485) !== 0) || ((((_la - 135)) & ~0x1F) === 0 && ((1 << (_la - 135)) & 817382163) !== 0)) {
				{
				this.state = 642;
				this.operandDefinition();
				this.state = 647;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===71) {
					{
					{
					this.state = 643;
					this.match(tricc_cqlParser.T__70);
					this.state = 644;
					this.operandDefinition();
					}
					}
					this.state = 649;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				}
			}

			this.state = 652;
			this.match(tricc_cqlParser.T__55);
			this.state = 655;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===84) {
				{
				this.state = 653;
				this.match(tricc_cqlParser.T__83);
				this.state = 654;
				this.typeSpecifier();
				}
			}

			this.state = 657;
			this.match(tricc_cqlParser.T__66);
			this.state = 660;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 2:
			case 3:
			case 4:
			case 5:
			case 7:
			case 8:
			case 21:
			case 23:
			case 24:
			case 25:
			case 27:
			case 28:
			case 29:
			case 30:
			case 33:
			case 34:
			case 35:
			case 36:
			case 37:
			case 38:
			case 39:
			case 43:
			case 44:
			case 46:
			case 49:
			case 50:
			case 51:
			case 52:
			case 53:
			case 55:
			case 57:
			case 58:
			case 59:
			case 60:
			case 61:
			case 62:
			case 63:
			case 64:
			case 65:
			case 66:
			case 68:
			case 69:
			case 70:
			case 74:
			case 75:
			case 76:
			case 77:
			case 78:
			case 80:
			case 81:
			case 82:
			case 83:
			case 93:
			case 97:
			case 99:
			case 100:
			case 101:
			case 102:
			case 103:
			case 104:
			case 105:
			case 106:
			case 107:
			case 108:
			case 109:
			case 110:
			case 111:
			case 112:
			case 113:
			case 114:
			case 115:
			case 125:
			case 126:
			case 127:
			case 128:
			case 135:
			case 136:
			case 139:
			case 143:
			case 144:
			case 145:
			case 146:
			case 147:
			case 148:
			case 149:
			case 150:
			case 151:
			case 154:
			case 155:
			case 156:
			case 157:
			case 158:
			case 159:
			case 160:
			case 161:
			case 162:
			case 163:
			case 164:
			case 165:
			case 166:
				{
				this.state = 658;
				this.functionBody();
				}
				break;
			case 85:
				{
				this.state = 659;
				this.match(tricc_cqlParser.T__84);
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
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
	public operandDefinition(): OperandDefinitionContext {
		let localctx: OperandDefinitionContext = new OperandDefinitionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 76, tricc_cqlParser.RULE_operandDefinition);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 662;
			this.referentialIdentifier();
			this.state = 663;
			this.typeSpecifier();
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
	public functionBody(): FunctionBodyContext {
		let localctx: FunctionBodyContext = new FunctionBodyContext(this, this._ctx, this.state);
		this.enterRule(localctx, 78, tricc_cqlParser.RULE_functionBody);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 665;
			this.expression(0);
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
	public querySource(): QuerySourceContext {
		let localctx: QuerySourceContext = new QuerySourceContext(this, this._ctx, this.state);
		this.enterRule(localctx, 80, tricc_cqlParser.RULE_querySource);
		try {
			this.state = 673;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 89:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 667;
				this.retrieve();
				}
				break;
			case 21:
			case 23:
			case 24:
			case 29:
			case 30:
			case 33:
			case 34:
			case 35:
			case 43:
			case 44:
			case 57:
			case 58:
			case 59:
			case 60:
			case 61:
			case 62:
			case 63:
			case 64:
			case 65:
			case 66:
			case 68:
			case 69:
			case 74:
			case 75:
			case 80:
			case 81:
			case 82:
			case 83:
			case 93:
			case 97:
			case 99:
			case 100:
			case 101:
			case 102:
			case 103:
			case 112:
			case 113:
			case 114:
			case 115:
			case 125:
			case 126:
			case 127:
			case 128:
			case 135:
			case 136:
			case 139:
			case 143:
			case 144:
			case 149:
			case 154:
			case 155:
			case 156:
			case 158:
			case 163:
			case 164:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 668;
				this.qualifiedIdentifierExpression();
				}
				break;
			case 55:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 669;
				this.match(tricc_cqlParser.T__54);
				this.state = 670;
				this.expression(0);
				this.state = 671;
				this.match(tricc_cqlParser.T__55);
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
	public aliasedQuerySource(): AliasedQuerySourceContext {
		let localctx: AliasedQuerySourceContext = new AliasedQuerySourceContext(this, this._ctx, this.state);
		this.enterRule(localctx, 82, tricc_cqlParser.RULE_aliasedQuerySource);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 675;
			this.querySource();
			this.state = 676;
			this.alias();
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
	public alias(): AliasContext {
		let localctx: AliasContext = new AliasContext(this, this._ctx, this.state);
		this.enterRule(localctx, 84, tricc_cqlParser.RULE_alias);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 678;
			this.identifier();
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
	public queryInclusionClause(): QueryInclusionClauseContext {
		let localctx: QueryInclusionClauseContext = new QueryInclusionClauseContext(this, this._ctx, this.state);
		this.enterRule(localctx, 86, tricc_cqlParser.RULE_queryInclusionClause);
		try {
			this.state = 682;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 86:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 680;
				this.withClause();
				}
				break;
			case 88:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 681;
				this.withoutClause();
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
	public withClause(): WithClauseContext {
		let localctx: WithClauseContext = new WithClauseContext(this, this._ctx, this.state);
		this.enterRule(localctx, 88, tricc_cqlParser.RULE_withClause);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 684;
			this.match(tricc_cqlParser.T__85);
			this.state = 685;
			this.aliasedQuerySource();
			this.state = 686;
			this.match(tricc_cqlParser.T__86);
			this.state = 687;
			this.expression(0);
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
	public withoutClause(): WithoutClauseContext {
		let localctx: WithoutClauseContext = new WithoutClauseContext(this, this._ctx, this.state);
		this.enterRule(localctx, 90, tricc_cqlParser.RULE_withoutClause);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 689;
			this.match(tricc_cqlParser.T__87);
			this.state = 690;
			this.aliasedQuerySource();
			this.state = 691;
			this.match(tricc_cqlParser.T__86);
			this.state = 692;
			this.expression(0);
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
	public retrieve(): RetrieveContext {
		let localctx: RetrieveContext = new RetrieveContext(this, this._ctx, this.state);
		this.enterRule(localctx, 92, tricc_cqlParser.RULE_retrieve);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 694;
			this.match(tricc_cqlParser.T__88);
			this.state = 698;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 57, this._ctx) ) {
			case 1:
				{
				this.state = 695;
				this.contextIdentifier();
				this.state = 696;
				this.match(tricc_cqlParser.T__89);
				}
				break;
			}
			this.state = 700;
			this.namedTypeSpecifier();
			this.state = 708;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===67) {
				{
				this.state = 701;
				this.match(tricc_cqlParser.T__66);
				this.state = 705;
				this._errHandler.sync(this);
				switch ( this._interp.adaptivePredict(this._input, 58, this._ctx) ) {
				case 1:
					{
					this.state = 702;
					this.codePath();
					this.state = 703;
					this.codeComparator();
					}
					break;
				}
				this.state = 707;
				this.terminology();
				}
			}

			this.state = 710;
			this.match(tricc_cqlParser.T__90);
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
	public contextIdentifier(): ContextIdentifierContext {
		let localctx: ContextIdentifierContext = new ContextIdentifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 94, tricc_cqlParser.RULE_contextIdentifier);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 712;
			this.qualifiedIdentifierExpression();
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
	public codePath(): CodePathContext {
		let localctx: CodePathContext = new CodePathContext(this, this._ctx, this.state);
		this.enterRule(localctx, 96, tricc_cqlParser.RULE_codePath);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 714;
			this.simplePath(0);
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
	public codeComparator(): CodeComparatorContext {
		let localctx: CodeComparatorContext = new CodeComparatorContext(this, this._ctx, this.state);
		this.enterRule(localctx, 98, tricc_cqlParser.RULE_codeComparator);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 716;
			_la = this._input.LA(1);
			if(!((((_la) & ~0x1F) === 0 && ((1 << _la) & 1376256) !== 0))) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
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
	public terminology(): TerminologyContext {
		let localctx: TerminologyContext = new TerminologyContext(this, this._ctx, this.state);
		this.enterRule(localctx, 100, tricc_cqlParser.RULE_terminology);
		try {
			this.state = 720;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 60, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 718;
				this.qualifiedIdentifierExpression();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 719;
				this.expression(0);
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
	public qualifier(): QualifierContext {
		let localctx: QualifierContext = new QualifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 102, tricc_cqlParser.RULE_qualifier);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 722;
			this.identifier();
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
	public query(): QueryContext {
		let localctx: QueryContext = new QueryContext(this, this._ctx, this.state);
		this.enterRule(localctx, 104, tricc_cqlParser.RULE_query);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 724;
			this.sourceClause();
			this.state = 726;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===92) {
				{
				this.state = 725;
				this.letClause();
				}
			}

			this.state = 731;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===86 || _la===88) {
				{
				{
				this.state = 728;
				this.queryInclusionClause();
				}
				}
				this.state = 733;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			this.state = 735;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===93) {
				{
				this.state = 734;
				this.whereClause();
				}
			}

			this.state = 739;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 96:
				{
				this.state = 737;
				this.aggregateClause();
				}
				break;
			case 94:
				{
				this.state = 738;
				this.returnClause();
				}
				break;
			case -1:
			case 98:
				break;
			default:
				break;
			}
			this.state = 742;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===98) {
				{
				this.state = 741;
				this.sortClause();
				}
			}

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
	public sourceClause(): SourceClauseContext {
		let localctx: SourceClauseContext = new SourceClauseContext(this, this._ctx, this.state);
		this.enterRule(localctx, 106, tricc_cqlParser.RULE_sourceClause);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 745;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===32) {
				{
				this.state = 744;
				this.match(tricc_cqlParser.T__31);
				}
			}

			this.state = 747;
			this.aliasedQuerySource();
			this.state = 752;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===71) {
				{
				{
				this.state = 748;
				this.match(tricc_cqlParser.T__70);
				this.state = 749;
				this.aliasedQuerySource();
				}
				}
				this.state = 754;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
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
	public letClause(): LetClauseContext {
		let localctx: LetClauseContext = new LetClauseContext(this, this._ctx, this.state);
		this.enterRule(localctx, 108, tricc_cqlParser.RULE_letClause);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 755;
			this.match(tricc_cqlParser.T__91);
			this.state = 756;
			this.letClauseItem();
			this.state = 761;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===71) {
				{
				{
				this.state = 757;
				this.match(tricc_cqlParser.T__70);
				this.state = 758;
				this.letClauseItem();
				}
				}
				this.state = 763;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
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
	public letClauseItem(): LetClauseItemContext {
		let localctx: LetClauseItemContext = new LetClauseItemContext(this, this._ctx, this.state);
		this.enterRule(localctx, 110, tricc_cqlParser.RULE_letClauseItem);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 764;
			this.identifier();
			this.state = 765;
			this.match(tricc_cqlParser.T__66);
			this.state = 766;
			this.expression(0);
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
	public whereClause(): WhereClauseContext {
		let localctx: WhereClauseContext = new WhereClauseContext(this, this._ctx, this.state);
		this.enterRule(localctx, 112, tricc_cqlParser.RULE_whereClause);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 768;
			this.match(tricc_cqlParser.T__92);
			this.state = 769;
			this.expression(0);
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
	public returnClause(): ReturnClauseContext {
		let localctx: ReturnClauseContext = new ReturnClauseContext(this, this._ctx, this.state);
		this.enterRule(localctx, 114, tricc_cqlParser.RULE_returnClause);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 771;
			this.match(tricc_cqlParser.T__93);
			this.state = 773;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 69, this._ctx) ) {
			case 1:
				{
				this.state = 772;
				_la = this._input.LA(1);
				if(!(_la===50 || _la===95)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				}
				break;
			}
			this.state = 775;
			this.expression(0);
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
	public aggregateClause(): AggregateClauseContext {
		let localctx: AggregateClauseContext = new AggregateClauseContext(this, this._ctx, this.state);
		this.enterRule(localctx, 116, tricc_cqlParser.RULE_aggregateClause);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 777;
			this.match(tricc_cqlParser.T__95);
			this.state = 779;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===50 || _la===95) {
				{
				this.state = 778;
				_la = this._input.LA(1);
				if(!(_la===50 || _la===95)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				}
			}

			this.state = 781;
			this.identifier();
			this.state = 783;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===97) {
				{
				this.state = 782;
				this.startingClause();
				}
			}

			this.state = 785;
			this.match(tricc_cqlParser.T__66);
			this.state = 786;
			this.expression(0);
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
	public startingClause(): StartingClauseContext {
		let localctx: StartingClauseContext = new StartingClauseContext(this, this._ctx, this.state);
		this.enterRule(localctx, 118, tricc_cqlParser.RULE_startingClause);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 788;
			this.match(tricc_cqlParser.T__96);
			this.state = 795;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 72, this._ctx) ) {
			case 1:
				{
				this.state = 789;
				this.simpleLiteral();
				}
				break;
			case 2:
				{
				this.state = 790;
				this.quantity();
				}
				break;
			case 3:
				{
				{
				this.state = 791;
				this.match(tricc_cqlParser.T__54);
				this.state = 792;
				this.expression(0);
				this.state = 793;
				this.match(tricc_cqlParser.T__55);
				}
				}
				break;
			}
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
	public sortClause(): SortClauseContext {
		let localctx: SortClauseContext = new SortClauseContext(this, this._ctx, this.state);
		this.enterRule(localctx, 120, tricc_cqlParser.RULE_sortClause);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 797;
			this.match(tricc_cqlParser.T__97);
			this.state = 808;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 100:
			case 101:
			case 102:
			case 103:
				{
				this.state = 798;
				this.sortDirection();
				}
				break;
			case 99:
				{
				{
				this.state = 799;
				this.match(tricc_cqlParser.T__98);
				this.state = 800;
				this.sortByItem();
				this.state = 805;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===71) {
					{
					{
					this.state = 801;
					this.match(tricc_cqlParser.T__70);
					this.state = 802;
					this.sortByItem();
					}
					}
					this.state = 807;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				}
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
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
	public sortDirection(): SortDirectionContext {
		let localctx: SortDirectionContext = new SortDirectionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 122, tricc_cqlParser.RULE_sortDirection);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 810;
			_la = this._input.LA(1);
			if(!(((((_la - 100)) & ~0x1F) === 0 && ((1 << (_la - 100)) & 15) !== 0))) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
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
	public sortByItem(): SortByItemContext {
		let localctx: SortByItemContext = new SortByItemContext(this, this._ctx, this.state);
		this.enterRule(localctx, 124, tricc_cqlParser.RULE_sortByItem);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 812;
			this.expressionTerm(0);
			this.state = 814;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (((((_la - 100)) & ~0x1F) === 0 && ((1 << (_la - 100)) & 15) !== 0)) {
				{
				this.state = 813;
				this.sortDirection();
				}
			}

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
	public qualifiedIdentifier(): QualifiedIdentifierContext {
		let localctx: QualifiedIdentifierContext = new QualifiedIdentifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 126, tricc_cqlParser.RULE_qualifiedIdentifier);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 821;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 76, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 816;
					this.qualifier();
					this.state = 817;
					this.match(tricc_cqlParser.T__72);
					}
					}
				}
				this.state = 823;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 76, this._ctx);
			}
			this.state = 824;
			this.identifier();
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
	public qualifiedIdentifierExpression(): QualifiedIdentifierExpressionContext {
		let localctx: QualifiedIdentifierExpressionContext = new QualifiedIdentifierExpressionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 128, tricc_cqlParser.RULE_qualifiedIdentifierExpression);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 831;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 77, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 826;
					this.qualifierExpression();
					this.state = 827;
					this.match(tricc_cqlParser.T__72);
					}
					}
				}
				this.state = 833;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 77, this._ctx);
			}
			this.state = 834;
			this.referentialIdentifier();
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
	public qualifierExpression(): QualifierExpressionContext {
		let localctx: QualifierExpressionContext = new QualifierExpressionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 130, tricc_cqlParser.RULE_qualifierExpression);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 836;
			this.referentialIdentifier();
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

	public simplePath(): SimplePathContext;
	public simplePath(_p: number): SimplePathContext;
	// @RuleVersion(0)
	public simplePath(_p?: number): SimplePathContext {
		if (_p === undefined) {
			_p = 0;
		}

		let _parentctx: ParserRuleContext = this._ctx;
		let _parentState: number = this.state;
		let localctx: SimplePathContext = new SimplePathContext(this, this._ctx, _parentState);
		let _prevctx: SimplePathContext = localctx;
		let _startState: number = 132;
		this.enterRecursionRule(localctx, 132, tricc_cqlParser.RULE_simplePath, _p);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			{
			localctx = new SimplePathReferentialIdentifierContext(this, localctx);
			this._ctx = localctx;
			_prevctx = localctx;

			this.state = 839;
			this.referentialIdentifier();
			}
			this._ctx.stop = this._input.LT(-1);
			this.state = 851;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 79, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					if (this._parseListeners != null) {
						this.triggerExitRuleEvent();
					}
					_prevctx = localctx;
					{
					this.state = 849;
					this._errHandler.sync(this);
					switch ( this._interp.adaptivePredict(this._input, 78, this._ctx) ) {
					case 1:
						{
						localctx = new SimplePathQualifiedIdentifierContext(this, new SimplePathContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, tricc_cqlParser.RULE_simplePath);
						this.state = 841;
						if (!(this.precpred(this._ctx, 2))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 2)");
						}
						this.state = 842;
						this.match(tricc_cqlParser.T__72);
						this.state = 843;
						this.referentialIdentifier();
						}
						break;
					case 2:
						{
						localctx = new SimplePathIndexerContext(this, new SimplePathContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, tricc_cqlParser.RULE_simplePath);
						this.state = 844;
						if (!(this.precpred(this._ctx, 1))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 1)");
						}
						this.state = 845;
						this.match(tricc_cqlParser.T__88);
						this.state = 846;
						this.simpleLiteral();
						this.state = 847;
						this.match(tricc_cqlParser.T__90);
						}
						break;
					}
					}
				}
				this.state = 853;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 79, this._ctx);
			}
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
			this.unrollRecursionContexts(_parentctx);
		}
		return localctx;
	}
	// @RuleVersion(0)
	public simpleLiteral(): SimpleLiteralContext {
		let localctx: SimpleLiteralContext = new SimpleLiteralContext(this, this._ctx, this.state);
		this.enterRule(localctx, 134, tricc_cqlParser.RULE_simpleLiteral);
		try {
			this.state = 856;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 165:
				localctx = new SimpleStringLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 854;
				this.match(tricc_cqlParser.STRING);
				}
				break;
			case 166:
				localctx = new SimpleNumberLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 855;
				this.match(tricc_cqlParser.NUMBER);
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
	public dateTimePrecision(): DateTimePrecisionContext {
		let localctx: DateTimePrecisionContext = new DateTimePrecisionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 136, tricc_cqlParser.RULE_dateTimePrecision);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 858;
			_la = this._input.LA(1);
			if(!(((((_la - 104)) & ~0x1F) === 0 && ((1 << (_la - 104)) & 255) !== 0))) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
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
	public dateTimeComponent(): DateTimeComponentContext {
		let localctx: DateTimeComponentContext = new DateTimeComponentContext(this, this._ctx, this.state);
		this.enterRule(localctx, 138, tricc_cqlParser.RULE_dateTimeComponent);
		try {
			this.state = 865;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 104:
			case 105:
			case 106:
			case 107:
			case 108:
			case 109:
			case 110:
			case 111:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 860;
				this.dateTimePrecision();
				}
				break;
			case 112:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 861;
				this.match(tricc_cqlParser.T__111);
				}
				break;
			case 113:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 862;
				this.match(tricc_cqlParser.T__112);
				}
				break;
			case 114:
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 863;
				this.match(tricc_cqlParser.T__113);
				}
				break;
			case 115:
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 864;
				this.match(tricc_cqlParser.T__114);
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
	public pluralDateTimePrecision(): PluralDateTimePrecisionContext {
		let localctx: PluralDateTimePrecisionContext = new PluralDateTimePrecisionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 140, tricc_cqlParser.RULE_pluralDateTimePrecision);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 867;
			_la = this._input.LA(1);
			if(!(((((_la - 116)) & ~0x1F) === 0 && ((1 << (_la - 116)) & 255) !== 0))) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
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
	public caseExpressionItem(): CaseExpressionItemContext {
		let localctx: CaseExpressionItemContext = new CaseExpressionItemContext(this, this._ctx, this.state);
		this.enterRule(localctx, 142, tricc_cqlParser.RULE_caseExpressionItem);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 869;
			this.match(tricc_cqlParser.T__123);
			this.state = 870;
			this.expression(0);
			this.state = 871;
			this.match(tricc_cqlParser.T__46);
			this.state = 872;
			this.expression(0);
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
	public dateTimePrecisionSpecifier(): DateTimePrecisionSpecifierContext {
		let localctx: DateTimePrecisionSpecifierContext = new DateTimePrecisionSpecifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 144, tricc_cqlParser.RULE_dateTimePrecisionSpecifier);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 874;
			this.dateTimePrecision();
			this.state = 875;
			this.match(tricc_cqlParser.T__30);
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
	public relativeQualifier(): RelativeQualifierContext {
		let localctx: RelativeQualifierContext = new RelativeQualifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 146, tricc_cqlParser.RULE_relativeQualifier);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 877;
			_la = this._input.LA(1);
			if(!(_la===125 || _la===126)) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
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
	public offsetRelativeQualifier(): OffsetRelativeQualifierContext {
		let localctx: OffsetRelativeQualifierContext = new OffsetRelativeQualifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 148, tricc_cqlParser.RULE_offsetRelativeQualifier);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 879;
			_la = this._input.LA(1);
			if(!(_la===127 || _la===128)) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
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
	public exclusiveRelativeQualifier(): ExclusiveRelativeQualifierContext {
		let localctx: ExclusiveRelativeQualifierContext = new ExclusiveRelativeQualifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 150, tricc_cqlParser.RULE_exclusiveRelativeQualifier);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 881;
			_la = this._input.LA(1);
			if(!(_la===129 || _la===130)) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
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
	public quantityOffset(): QuantityOffsetContext {
		let localctx: QuantityOffsetContext = new QuantityOffsetContext(this, this._ctx, this.state);
		this.enterRule(localctx, 152, tricc_cqlParser.RULE_quantityOffset);
		let _la: number;
		try {
			this.state = 890;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 166:
				this.enterOuterAlt(localctx, 1);
				{
				{
				this.state = 883;
				this.quantity();
				this.state = 885;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===127 || _la===128) {
					{
					this.state = 884;
					this.offsetRelativeQualifier();
					}
				}

				}
				}
				break;
			case 129:
			case 130:
				this.enterOuterAlt(localctx, 2);
				{
				{
				this.state = 887;
				this.exclusiveRelativeQualifier();
				this.state = 888;
				this.quantity();
				}
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
	public temporalRelationship(): TemporalRelationshipContext {
		let localctx: TemporalRelationshipContext = new TemporalRelationshipContext(this, this._ctx, this.state);
		this.enterRule(localctx, 154, tricc_cqlParser.RULE_temporalRelationship);
		let _la: number;
		try {
			this.state = 900;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 86, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				{
				this.state = 893;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===131) {
					{
					this.state = 892;
					this.match(tricc_cqlParser.T__130);
					}
				}

				this.state = 895;
				_la = this._input.LA(1);
				if(!(_la===132 || _la===133)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				}
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				{
				this.state = 896;
				_la = this._input.LA(1);
				if(!(_la===132 || _la===133)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				this.state = 898;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===134) {
					{
					this.state = 897;
					this.match(tricc_cqlParser.T__133);
					}
				}

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
	public intervalOperatorPhrase(): IntervalOperatorPhraseContext {
		let localctx: IntervalOperatorPhraseContext = new IntervalOperatorPhraseContext(this, this._ctx, this.state);
		this.enterRule(localctx, 156, tricc_cqlParser.RULE_intervalOperatorPhrase);
		let _la: number;
		try {
			this.state = 983;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 110, this._ctx) ) {
			case 1:
				localctx = new ConcurrentWithIntervalOperatorPhraseContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 903;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (((((_la - 135)) & ~0x1F) === 0 && ((1 << (_la - 135)) & 7) !== 0)) {
					{
					this.state = 902;
					_la = this._input.LA(1);
					if(!(((((_la - 135)) & ~0x1F) === 0 && ((1 << (_la - 135)) & 7) !== 0))) {
					this._errHandler.recoverInline(this);
					}
					else {
						this._errHandler.reportMatch(this);
					    this.consume();
					}
					}
				}

				this.state = 905;
				this.match(tricc_cqlParser.T__137);
				this.state = 907;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (((((_la - 104)) & ~0x1F) === 0 && ((1 << (_la - 104)) & 255) !== 0)) {
					{
					this.state = 906;
					this.dateTimePrecision();
					}
				}

				this.state = 911;
				this._errHandler.sync(this);
				switch (this._input.LA(1)) {
				case 125:
				case 126:
					{
					this.state = 909;
					this.relativeQualifier();
					}
					break;
				case 6:
					{
					this.state = 910;
					this.match(tricc_cqlParser.T__5);
					}
					break;
				default:
					throw new NoViableAltException(this);
				}
				this.state = 914;
				this._errHandler.sync(this);
				switch ( this._interp.adaptivePredict(this._input, 90, this._ctx) ) {
				case 1:
					{
					this.state = 913;
					_la = this._input.LA(1);
					if(!(_la===29 || _la===30)) {
					this._errHandler.recoverInline(this);
					}
					else {
						this._errHandler.reportMatch(this);
					    this.consume();
					}
					}
					break;
				}
				}
				break;
			case 2:
				localctx = new IncludesIntervalOperatorPhraseContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 917;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===9) {
					{
					this.state = 916;
					this.match(tricc_cqlParser.T__8);
					}
				}

				this.state = 919;
				this.match(tricc_cqlParser.T__138);
				this.state = 921;
				this._errHandler.sync(this);
				switch ( this._interp.adaptivePredict(this._input, 92, this._ctx) ) {
				case 1:
					{
					this.state = 920;
					this.dateTimePrecisionSpecifier();
					}
					break;
				}
				this.state = 924;
				this._errHandler.sync(this);
				switch ( this._interp.adaptivePredict(this._input, 93, this._ctx) ) {
				case 1:
					{
					this.state = 923;
					_la = this._input.LA(1);
					if(!(_la===29 || _la===30)) {
					this._errHandler.recoverInline(this);
					}
					else {
						this._errHandler.reportMatch(this);
					    this.consume();
					}
					}
					break;
				}
				}
				break;
			case 3:
				localctx = new IncludedInIntervalOperatorPhraseContext(this, localctx);
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 927;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (((((_la - 135)) & ~0x1F) === 0 && ((1 << (_la - 135)) & 7) !== 0)) {
					{
					this.state = 926;
					_la = this._input.LA(1);
					if(!(((((_la - 135)) & ~0x1F) === 0 && ((1 << (_la - 135)) & 7) !== 0))) {
					this._errHandler.recoverInline(this);
					}
					else {
						this._errHandler.reportMatch(this);
					    this.consume();
					}
					}
				}

				this.state = 930;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===9) {
					{
					this.state = 929;
					this.match(tricc_cqlParser.T__8);
					}
				}

				this.state = 932;
				_la = this._input.LA(1);
				if(!(_la===140 || _la===141)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				this.state = 934;
				this._errHandler.sync(this);
				switch ( this._interp.adaptivePredict(this._input, 96, this._ctx) ) {
				case 1:
					{
					this.state = 933;
					this.dateTimePrecisionSpecifier();
					}
					break;
				}
				}
				break;
			case 4:
				localctx = new BeforeOrAfterIntervalOperatorPhraseContext(this, localctx);
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 937;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (((((_la - 135)) & ~0x1F) === 0 && ((1 << (_la - 135)) & 7) !== 0)) {
					{
					this.state = 936;
					_la = this._input.LA(1);
					if(!(((((_la - 135)) & ~0x1F) === 0 && ((1 << (_la - 135)) & 7) !== 0))) {
					this._errHandler.recoverInline(this);
					}
					else {
						this._errHandler.reportMatch(this);
					    this.consume();
					}
					}
				}

				this.state = 940;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===129 || _la===130 || _la===166) {
					{
					this.state = 939;
					this.quantityOffset();
					}
				}

				this.state = 942;
				this.temporalRelationship();
				this.state = 944;
				this._errHandler.sync(this);
				switch ( this._interp.adaptivePredict(this._input, 99, this._ctx) ) {
				case 1:
					{
					this.state = 943;
					this.dateTimePrecisionSpecifier();
					}
					break;
				}
				this.state = 947;
				this._errHandler.sync(this);
				switch ( this._interp.adaptivePredict(this._input, 100, this._ctx) ) {
				case 1:
					{
					this.state = 946;
					_la = this._input.LA(1);
					if(!(_la===29 || _la===30)) {
					this._errHandler.recoverInline(this);
					}
					else {
						this._errHandler.reportMatch(this);
					    this.consume();
					}
					}
					break;
				}
				}
				break;
			case 5:
				localctx = new WithinIntervalOperatorPhraseContext(this, localctx);
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 950;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (((((_la - 135)) & ~0x1F) === 0 && ((1 << (_la - 135)) & 7) !== 0)) {
					{
					this.state = 949;
					_la = this._input.LA(1);
					if(!(((((_la - 135)) & ~0x1F) === 0 && ((1 << (_la - 135)) & 7) !== 0))) {
					this._errHandler.recoverInline(this);
					}
					else {
						this._errHandler.reportMatch(this);
					    this.consume();
					}
					}
				}

				this.state = 953;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===9) {
					{
					this.state = 952;
					this.match(tricc_cqlParser.T__8);
					}
				}

				this.state = 955;
				this.match(tricc_cqlParser.T__141);
				this.state = 956;
				this.quantity();
				this.state = 957;
				this.match(tricc_cqlParser.T__30);
				this.state = 959;
				this._errHandler.sync(this);
				switch ( this._interp.adaptivePredict(this._input, 103, this._ctx) ) {
				case 1:
					{
					this.state = 958;
					_la = this._input.LA(1);
					if(!(_la===29 || _la===30)) {
					this._errHandler.recoverInline(this);
					}
					else {
						this._errHandler.reportMatch(this);
					    this.consume();
					}
					}
					break;
				}
				}
				break;
			case 6:
				localctx = new MeetsIntervalOperatorPhraseContext(this, localctx);
				this.enterOuterAlt(localctx, 6);
				{
				this.state = 961;
				this.match(tricc_cqlParser.T__142);
				this.state = 963;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===132 || _la===133) {
					{
					this.state = 962;
					_la = this._input.LA(1);
					if(!(_la===132 || _la===133)) {
					this._errHandler.recoverInline(this);
					}
					else {
						this._errHandler.reportMatch(this);
					    this.consume();
					}
					}
				}

				this.state = 966;
				this._errHandler.sync(this);
				switch ( this._interp.adaptivePredict(this._input, 105, this._ctx) ) {
				case 1:
					{
					this.state = 965;
					this.dateTimePrecisionSpecifier();
					}
					break;
				}
				}
				break;
			case 7:
				localctx = new OverlapsIntervalOperatorPhraseContext(this, localctx);
				this.enterOuterAlt(localctx, 7);
				{
				this.state = 968;
				this.match(tricc_cqlParser.T__143);
				this.state = 970;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===132 || _la===133) {
					{
					this.state = 969;
					_la = this._input.LA(1);
					if(!(_la===132 || _la===133)) {
					this._errHandler.recoverInline(this);
					}
					else {
						this._errHandler.reportMatch(this);
					    this.consume();
					}
					}
				}

				this.state = 973;
				this._errHandler.sync(this);
				switch ( this._interp.adaptivePredict(this._input, 107, this._ctx) ) {
				case 1:
					{
					this.state = 972;
					this.dateTimePrecisionSpecifier();
					}
					break;
				}
				}
				break;
			case 8:
				localctx = new StartsIntervalOperatorPhraseContext(this, localctx);
				this.enterOuterAlt(localctx, 8);
				{
				this.state = 975;
				this.match(tricc_cqlParser.T__134);
				this.state = 977;
				this._errHandler.sync(this);
				switch ( this._interp.adaptivePredict(this._input, 108, this._ctx) ) {
				case 1:
					{
					this.state = 976;
					this.dateTimePrecisionSpecifier();
					}
					break;
				}
				}
				break;
			case 9:
				localctx = new EndsIntervalOperatorPhraseContext(this, localctx);
				this.enterOuterAlt(localctx, 9);
				{
				this.state = 979;
				this.match(tricc_cqlParser.T__135);
				this.state = 981;
				this._errHandler.sync(this);
				switch ( this._interp.adaptivePredict(this._input, 109, this._ctx) ) {
				case 1:
					{
					this.state = 980;
					this.dateTimePrecisionSpecifier();
					}
					break;
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
	public qualifiedInvocation(): QualifiedInvocationContext {
		let localctx: QualifiedInvocationContext = new QualifiedInvocationContext(this, this._ctx, this.state);
		this.enterRule(localctx, 158, tricc_cqlParser.RULE_qualifiedInvocation);
		try {
			this.state = 987;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 111, this._ctx) ) {
			case 1:
				localctx = new QualifiedMemberInvocationContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 985;
				this.referentialIdentifier();
				}
				break;
			case 2:
				localctx = new QualifiedFunctionInvocationContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 986;
				this.qualifiedFunction();
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
	public qualifiedFunction(): QualifiedFunctionContext {
		let localctx: QualifiedFunctionContext = new QualifiedFunctionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 160, tricc_cqlParser.RULE_qualifiedFunction);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 989;
			this.identifierOrFunctionIdentifier();
			this.state = 990;
			this.match(tricc_cqlParser.T__54);
			this.state = 992;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if ((((_la) & ~0x1F) === 0 && ((1 << _la) & 2074083772) !== 0) || ((((_la - 33)) & ~0x1F) === 0 && ((1 << (_la - 33)) & 4284427391) !== 0) || ((((_la - 65)) & ~0x1F) === 0 && ((1 << (_la - 65)) & 268942907) !== 0) || ((((_la - 97)) & ~0x1F) === 0 && ((1 << (_la - 97)) & 4027056125) !== 0) || ((((_la - 135)) & ~0x1F) === 0 && ((1 << (_la - 135)) & 4294573843) !== 0)) {
				{
				this.state = 991;
				this.paramList();
				}
			}

			this.state = 994;
			this.match(tricc_cqlParser.T__55);
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
	public invocation(): InvocationContext {
		let localctx: InvocationContext = new InvocationContext(this, this._ctx, this.state);
		this.enterRule(localctx, 162, tricc_cqlParser.RULE_invocation);
		try {
			this.state = 1001;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 113, this._ctx) ) {
			case 1:
				localctx = new MemberInvocationContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 996;
				this.referentialIdentifier();
				}
				break;
			case 2:
				localctx = new FunctionInvocationContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 997;
				this.function_();
				}
				break;
			case 3:
				localctx = new ThisInvocationContext(this, localctx);
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 998;
				this.match(tricc_cqlParser.T__144);
				}
				break;
			case 4:
				localctx = new IndexInvocationContext(this, localctx);
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 999;
				this.match(tricc_cqlParser.T__145);
				}
				break;
			case 5:
				localctx = new TotalInvocationContext(this, localctx);
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 1000;
				this.match(tricc_cqlParser.T__146);
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
	public function_(): FunctionContext {
		let localctx: FunctionContext = new FunctionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 164, tricc_cqlParser.RULE_function);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1003;
			this.referentialIdentifier();
			this.state = 1004;
			this.match(tricc_cqlParser.T__54);
			this.state = 1006;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if ((((_la) & ~0x1F) === 0 && ((1 << _la) & 2074083772) !== 0) || ((((_la - 33)) & ~0x1F) === 0 && ((1 << (_la - 33)) & 4284427391) !== 0) || ((((_la - 65)) & ~0x1F) === 0 && ((1 << (_la - 65)) & 268942907) !== 0) || ((((_la - 97)) & ~0x1F) === 0 && ((1 << (_la - 97)) & 4027056125) !== 0) || ((((_la - 135)) & ~0x1F) === 0 && ((1 << (_la - 135)) & 4294573843) !== 0)) {
				{
				this.state = 1005;
				this.paramList();
				}
			}

			this.state = 1008;
			this.match(tricc_cqlParser.T__55);
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
	public ratio(): RatioContext {
		let localctx: RatioContext = new RatioContext(this, this._ctx, this.state);
		this.enterRule(localctx, 166, tricc_cqlParser.RULE_ratio);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1010;
			this.quantity();
			this.state = 1011;
			this.match(tricc_cqlParser.T__66);
			this.state = 1012;
			this.quantity();
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
	public externalConstant(): ExternalConstantContext {
		let localctx: ExternalConstantContext = new ExternalConstantContext(this, this._ctx, this.state);
		this.enterRule(localctx, 168, tricc_cqlParser.RULE_externalConstant);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1014;
			this.match(tricc_cqlParser.T__147);
			this.state = 1018;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 21:
			case 23:
			case 24:
			case 29:
			case 30:
			case 33:
			case 34:
			case 35:
			case 43:
			case 44:
			case 57:
			case 58:
			case 59:
			case 60:
			case 61:
			case 62:
			case 63:
			case 64:
			case 65:
			case 66:
			case 68:
			case 69:
			case 74:
			case 75:
			case 80:
			case 81:
			case 82:
			case 83:
			case 93:
			case 97:
			case 99:
			case 100:
			case 101:
			case 102:
			case 103:
			case 112:
			case 113:
			case 114:
			case 115:
			case 125:
			case 126:
			case 127:
			case 128:
			case 135:
			case 136:
			case 139:
			case 143:
			case 144:
			case 149:
			case 154:
			case 155:
			case 156:
				{
				this.state = 1015;
				this.keywordIdentifier();
				}
				break;
			case 158:
			case 163:
			case 164:
				{
				this.state = 1016;
				this.identifier();
				}
				break;
			case 165:
				{
				this.state = 1017;
				this.match(tricc_cqlParser.STRING);
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
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
	public intervalSelector(): IntervalSelectorContext {
		let localctx: IntervalSelectorContext = new IntervalSelectorContext(this, this._ctx, this.state);
		this.enterRule(localctx, 170, tricc_cqlParser.RULE_intervalSelector);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1020;
			this.match(tricc_cqlParser.T__76);
			this.state = 1021;
			_la = this._input.LA(1);
			if(!(_la===55 || _la===89)) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
			this.state = 1022;
			this.expression(0);
			this.state = 1023;
			this.match(tricc_cqlParser.T__70);
			this.state = 1024;
			this.expression(0);
			this.state = 1025;
			_la = this._input.LA(1);
			if(!(_la===56 || _la===91)) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
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
	public tupleSelector(): TupleSelectorContext {
		let localctx: TupleSelectorContext = new TupleSelectorContext(this, this._ctx, this.state);
		this.enterRule(localctx, 172, tricc_cqlParser.RULE_tupleSelector);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1028;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===78) {
				{
				this.state = 1027;
				this.match(tricc_cqlParser.T__77);
				}
			}

			this.state = 1030;
			this.match(tricc_cqlParser.T__69);
			this.state = 1040;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 67:
				{
				this.state = 1031;
				this.match(tricc_cqlParser.T__66);
				}
				break;
			case 21:
			case 23:
			case 24:
			case 29:
			case 30:
			case 33:
			case 34:
			case 35:
			case 43:
			case 44:
			case 57:
			case 58:
			case 59:
			case 60:
			case 61:
			case 62:
			case 63:
			case 64:
			case 65:
			case 66:
			case 68:
			case 69:
			case 74:
			case 75:
			case 80:
			case 81:
			case 82:
			case 83:
			case 93:
			case 97:
			case 99:
			case 100:
			case 101:
			case 102:
			case 103:
			case 112:
			case 113:
			case 114:
			case 115:
			case 125:
			case 126:
			case 127:
			case 128:
			case 135:
			case 136:
			case 139:
			case 143:
			case 144:
			case 149:
			case 154:
			case 155:
			case 156:
			case 158:
			case 163:
			case 164:
				{
				{
				this.state = 1032;
				this.tupleElementSelector();
				this.state = 1037;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===71) {
					{
					{
					this.state = 1033;
					this.match(tricc_cqlParser.T__70);
					this.state = 1034;
					this.tupleElementSelector();
					}
					}
					this.state = 1039;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				}
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
			this.state = 1042;
			this.match(tricc_cqlParser.T__71);
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
	public tupleElementSelector(): TupleElementSelectorContext {
		let localctx: TupleElementSelectorContext = new TupleElementSelectorContext(this, this._ctx, this.state);
		this.enterRule(localctx, 174, tricc_cqlParser.RULE_tupleElementSelector);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1044;
			this.referentialIdentifier();
			this.state = 1045;
			this.match(tricc_cqlParser.T__66);
			this.state = 1046;
			this.expression(0);
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
	public instanceSelector(): InstanceSelectorContext {
		let localctx: InstanceSelectorContext = new InstanceSelectorContext(this, this._ctx, this.state);
		this.enterRule(localctx, 176, tricc_cqlParser.RULE_instanceSelector);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1048;
			this.namedTypeSpecifier();
			this.state = 1049;
			this.match(tricc_cqlParser.T__69);
			this.state = 1059;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 67:
				{
				this.state = 1050;
				this.match(tricc_cqlParser.T__66);
				}
				break;
			case 21:
			case 23:
			case 24:
			case 29:
			case 30:
			case 33:
			case 34:
			case 35:
			case 43:
			case 44:
			case 57:
			case 58:
			case 59:
			case 60:
			case 61:
			case 62:
			case 63:
			case 64:
			case 65:
			case 66:
			case 68:
			case 69:
			case 74:
			case 75:
			case 80:
			case 81:
			case 82:
			case 83:
			case 93:
			case 97:
			case 99:
			case 100:
			case 101:
			case 102:
			case 103:
			case 112:
			case 113:
			case 114:
			case 115:
			case 125:
			case 126:
			case 127:
			case 128:
			case 135:
			case 136:
			case 139:
			case 143:
			case 144:
			case 149:
			case 154:
			case 155:
			case 156:
			case 158:
			case 163:
			case 164:
				{
				{
				this.state = 1051;
				this.instanceElementSelector();
				this.state = 1056;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===71) {
					{
					{
					this.state = 1052;
					this.match(tricc_cqlParser.T__70);
					this.state = 1053;
					this.instanceElementSelector();
					}
					}
					this.state = 1058;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				}
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
			this.state = 1061;
			this.match(tricc_cqlParser.T__71);
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
	public instanceElementSelector(): InstanceElementSelectorContext {
		let localctx: InstanceElementSelectorContext = new InstanceElementSelectorContext(this, this._ctx, this.state);
		this.enterRule(localctx, 178, tricc_cqlParser.RULE_instanceElementSelector);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1063;
			this.referentialIdentifier();
			this.state = 1064;
			this.match(tricc_cqlParser.T__66);
			this.state = 1065;
			this.expression(0);
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
	public listSelector(): ListSelectorContext {
		let localctx: ListSelectorContext = new ListSelectorContext(this, this._ctx, this.state);
		this.enterRule(localctx, 180, tricc_cqlParser.RULE_listSelector);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1074;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===76) {
				{
				this.state = 1067;
				this.match(tricc_cqlParser.T__75);
				this.state = 1072;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===13) {
					{
					this.state = 1068;
					this.match(tricc_cqlParser.T__12);
					this.state = 1069;
					this.typeSpecifier();
					this.state = 1070;
					this.match(tricc_cqlParser.T__13);
					}
				}

				}
			}

			this.state = 1076;
			this.match(tricc_cqlParser.T__69);
			this.state = 1085;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if ((((_la) & ~0x1F) === 0 && ((1 << _la) & 2074083772) !== 0) || ((((_la - 33)) & ~0x1F) === 0 && ((1 << (_la - 33)) & 4284427391) !== 0) || ((((_la - 65)) & ~0x1F) === 0 && ((1 << (_la - 65)) & 268942907) !== 0) || ((((_la - 97)) & ~0x1F) === 0 && ((1 << (_la - 97)) & 4027056125) !== 0) || ((((_la - 135)) & ~0x1F) === 0 && ((1 << (_la - 135)) & 4294573843) !== 0)) {
				{
				this.state = 1077;
				this.expression(0);
				this.state = 1082;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===71) {
					{
					{
					this.state = 1078;
					this.match(tricc_cqlParser.T__70);
					this.state = 1079;
					this.expression(0);
					}
					}
					this.state = 1084;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				}
			}

			this.state = 1087;
			this.match(tricc_cqlParser.T__71);
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
	public displayClause(): DisplayClauseContext {
		let localctx: DisplayClauseContext = new DisplayClauseContext(this, this._ctx, this.state);
		this.enterRule(localctx, 182, tricc_cqlParser.RULE_displayClause);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1089;
			this.match(tricc_cqlParser.T__148);
			this.state = 1090;
			this.match(tricc_cqlParser.STRING);
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
	public codeSelector(): CodeSelectorContext {
		let localctx: CodeSelectorContext = new CodeSelectorContext(this, this._ctx, this.state);
		this.enterRule(localctx, 184, tricc_cqlParser.RULE_codeSelector);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1092;
			this.match(tricc_cqlParser.T__149);
			this.state = 1093;
			this.match(tricc_cqlParser.STRING);
			this.state = 1094;
			this.match(tricc_cqlParser.T__31);
			this.state = 1095;
			this.codesystemIdentifier();
			this.state = 1097;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 125, this._ctx) ) {
			case 1:
				{
				this.state = 1096;
				this.displayClause();
				}
				break;
			}
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
	public conceptSelector(): ConceptSelectorContext {
		let localctx: ConceptSelectorContext = new ConceptSelectorContext(this, this._ctx, this.state);
		this.enterRule(localctx, 186, tricc_cqlParser.RULE_conceptSelector);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1099;
			this.match(tricc_cqlParser.T__150);
			this.state = 1100;
			this.match(tricc_cqlParser.T__69);
			this.state = 1101;
			this.codeSelector();
			this.state = 1106;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===71) {
				{
				{
				this.state = 1102;
				this.match(tricc_cqlParser.T__70);
				this.state = 1103;
				this.codeSelector();
				}
				}
				this.state = 1108;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			this.state = 1109;
			this.match(tricc_cqlParser.T__71);
			this.state = 1111;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 127, this._ctx) ) {
			case 1:
				{
				this.state = 1110;
				this.displayClause();
				}
				break;
			}
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
	public keyword(): KeywordContext {
		let localctx: KeywordContext = new KeywordContext(this, this._ctx, this.state);
		this.enterRule(localctx, 188, tricc_cqlParser.RULE_keyword);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1113;
			_la = this._input.LA(1);
			if(!((((_la) & ~0x1F) === 0 && ((1 << _la) & 3891269630) !== 0) || ((((_la - 32)) & ~0x1F) === 0 && ((1 << (_la - 32)) & 4269791487) !== 0) || ((((_la - 64)) & ~0x1F) === 0 && ((1 << (_la - 64)) & 4056906807) !== 0) || ((((_la - 96)) & ~0x1F) === 0 && ((1 << (_la - 96)) & 4294967295) !== 0) || ((((_la - 128)) & ~0x1F) === 0 && ((1 << (_la - 128)) & 534904825) !== 0))) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
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
	public reservedWord(): ReservedWordContext {
		let localctx: ReservedWordContext = new ReservedWordContext(this, this._ctx, this.state);
		this.enterRule(localctx, 190, tricc_cqlParser.RULE_reservedWord);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1115;
			_la = this._input.LA(1);
			if(!((((_la) & ~0x1F) === 0 && ((1 << _la) & 2253393918) !== 0) || ((((_la - 32)) & ~0x1F) === 0 && ((1 << (_la - 32)) & 8372465) !== 0) || ((((_la - 76)) & ~0x1F) === 0 && ((1 << (_la - 76)) & 4032633863) !== 0) || ((((_la - 108)) & ~0x1F) === 0 && ((1 << (_la - 108)) & 1736572687) !== 0) || ((((_la - 140)) & ~0x1F) === 0 && ((1 << (_la - 140)) & 15367) !== 0))) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
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
	public keywordIdentifier(): KeywordIdentifierContext {
		let localctx: KeywordIdentifierContext = new KeywordIdentifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 192, tricc_cqlParser.RULE_keywordIdentifier);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1117;
			_la = this._input.LA(1);
			if(!(((((_la - 21)) & ~0x1F) === 0 && ((1 << (_la - 21)) & 12612365) !== 0) || ((((_la - 57)) & ~0x1F) === 0 && ((1 << (_la - 57)) & 126229503) !== 0) || ((((_la - 93)) & ~0x1F) === 0 && ((1 << (_la - 93)) & 7866321) !== 0) || ((((_la - 125)) & ~0x1F) === 0 && ((1 << (_la - 125)) & 3775679503) !== 0))) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
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
	public obsoleteIdentifier(): ObsoleteIdentifierContext {
		let localctx: ObsoleteIdentifierContext = new ObsoleteIdentifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 194, tricc_cqlParser.RULE_obsoleteIdentifier);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1119;
			_la = this._input.LA(1);
			if(!((((_la) & ~0x1F) === 0 && ((1 << _la) & 1612710148) !== 0) || ((((_la - 50)) & ~0x1F) === 0 && ((1 << (_la - 50)) & 50331905) !== 0) || ((((_la - 93)) & ~0x1F) === 0 && ((1 << (_la - 93)) & 7864325) !== 0) || ((((_la - 149)) & ~0x1F) === 0 && ((1 << (_la - 149)) & 7) !== 0))) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
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
	public functionIdentifier(): FunctionIdentifierContext {
		let localctx: FunctionIdentifierContext = new FunctionIdentifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 196, tricc_cqlParser.RULE_functionIdentifier);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1121;
			_la = this._input.LA(1);
			if(!((((_la) & ~0x1F) === 0 && ((1 << _la) & 3891269630) !== 0) || ((((_la - 32)) & ~0x1F) === 0 && ((1 << (_la - 32)) & 4269791487) !== 0) || ((((_la - 64)) & ~0x1F) === 0 && ((1 << (_la - 64)) & 4056906807) !== 0) || ((((_la - 96)) & ~0x1F) === 0 && ((1 << (_la - 96)) & 4294967295) !== 0) || ((((_la - 128)) & ~0x1F) === 0 && ((1 << (_la - 128)) & 534904753) !== 0))) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
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
	public typeNameIdentifier(): TypeNameIdentifierContext {
		let localctx: TypeNameIdentifierContext = new TypeNameIdentifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 198, tricc_cqlParser.RULE_typeNameIdentifier);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1123;
			_la = this._input.LA(1);
			if(!(_la===112 || _la===113 || _la===150 || _la===151)) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
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
	public referentialIdentifier(): ReferentialIdentifierContext {
		let localctx: ReferentialIdentifierContext = new ReferentialIdentifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 200, tricc_cqlParser.RULE_referentialIdentifier);
		try {
			this.state = 1127;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 158:
			case 163:
			case 164:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 1125;
				this.identifier();
				}
				break;
			case 21:
			case 23:
			case 24:
			case 29:
			case 30:
			case 33:
			case 34:
			case 35:
			case 43:
			case 44:
			case 57:
			case 58:
			case 59:
			case 60:
			case 61:
			case 62:
			case 63:
			case 64:
			case 65:
			case 66:
			case 68:
			case 69:
			case 74:
			case 75:
			case 80:
			case 81:
			case 82:
			case 83:
			case 93:
			case 97:
			case 99:
			case 100:
			case 101:
			case 102:
			case 103:
			case 112:
			case 113:
			case 114:
			case 115:
			case 125:
			case 126:
			case 127:
			case 128:
			case 135:
			case 136:
			case 139:
			case 143:
			case 144:
			case 149:
			case 154:
			case 155:
			case 156:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 1126;
				this.keywordIdentifier();
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
	public referentialOrTypeNameIdentifier(): ReferentialOrTypeNameIdentifierContext {
		let localctx: ReferentialOrTypeNameIdentifierContext = new ReferentialOrTypeNameIdentifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 202, tricc_cqlParser.RULE_referentialOrTypeNameIdentifier);
		try {
			this.state = 1131;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 129, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 1129;
				this.referentialIdentifier();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 1130;
				this.typeNameIdentifier();
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
	public identifierOrFunctionIdentifier(): IdentifierOrFunctionIdentifierContext {
		let localctx: IdentifierOrFunctionIdentifierContext = new IdentifierOrFunctionIdentifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 204, tricc_cqlParser.RULE_identifierOrFunctionIdentifier);
		try {
			this.state = 1135;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 158:
			case 163:
			case 164:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 1133;
				this.identifier();
				}
				break;
			case 1:
			case 2:
			case 3:
			case 4:
			case 5:
			case 6:
			case 7:
			case 8:
			case 9:
			case 10:
			case 11:
			case 20:
			case 21:
			case 22:
			case 23:
			case 24:
			case 25:
			case 26:
			case 29:
			case 30:
			case 31:
			case 32:
			case 33:
			case 34:
			case 35:
			case 36:
			case 37:
			case 38:
			case 39:
			case 43:
			case 44:
			case 46:
			case 47:
			case 48:
			case 49:
			case 50:
			case 51:
			case 52:
			case 53:
			case 54:
			case 57:
			case 58:
			case 59:
			case 60:
			case 61:
			case 62:
			case 63:
			case 64:
			case 65:
			case 66:
			case 68:
			case 69:
			case 74:
			case 75:
			case 76:
			case 77:
			case 78:
			case 80:
			case 81:
			case 82:
			case 83:
			case 86:
			case 87:
			case 88:
			case 92:
			case 93:
			case 94:
			case 95:
			case 96:
			case 97:
			case 98:
			case 99:
			case 100:
			case 101:
			case 102:
			case 103:
			case 104:
			case 105:
			case 106:
			case 107:
			case 108:
			case 109:
			case 110:
			case 111:
			case 112:
			case 113:
			case 114:
			case 115:
			case 116:
			case 117:
			case 118:
			case 119:
			case 120:
			case 121:
			case 122:
			case 123:
			case 124:
			case 125:
			case 126:
			case 127:
			case 128:
			case 132:
			case 133:
			case 135:
			case 136:
			case 137:
			case 138:
			case 139:
			case 140:
			case 141:
			case 142:
			case 143:
			case 144:
			case 149:
			case 150:
			case 151:
			case 152:
			case 153:
			case 154:
			case 155:
			case 156:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 1134;
				this.functionIdentifier();
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
	public identifier(): IdentifierContext {
		let localctx: IdentifierContext = new IdentifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 206, tricc_cqlParser.RULE_identifier);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1137;
			_la = this._input.LA(1);
			if(!(((((_la - 158)) & ~0x1F) === 0 && ((1 << (_la - 158)) & 97) !== 0))) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
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
	public paramList(): ParamListContext {
		let localctx: ParamListContext = new ParamListContext(this, this._ctx, this.state);
		this.enterRule(localctx, 208, tricc_cqlParser.RULE_paramList);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1139;
			this.expression(0);
			this.state = 1144;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===71) {
				{
				{
				this.state = 1140;
				this.match(tricc_cqlParser.T__70);
				this.state = 1141;
				this.expression(0);
				}
				}
				this.state = 1146;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
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
	public quantity(): QuantityContext {
		let localctx: QuantityContext = new QuantityContext(this, this._ctx, this.state);
		this.enterRule(localctx, 210, tricc_cqlParser.RULE_quantity);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1147;
			this.match(tricc_cqlParser.NUMBER);
			this.state = 1149;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (((((_la - 104)) & ~0x1F) === 0 && ((1 << (_la - 104)) & 1044735) !== 0) || _la===165) {
				{
				this.state = 1148;
				this.unit();
				}
			}

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
	public unit(): UnitContext {
		let localctx: UnitContext = new UnitContext(this, this._ctx, this.state);
		this.enterRule(localctx, 212, tricc_cqlParser.RULE_unit);
		try {
			this.state = 1154;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 104:
			case 105:
			case 106:
			case 107:
			case 108:
			case 109:
			case 110:
			case 111:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 1151;
				this.dateTimePrecision();
				}
				break;
			case 116:
			case 117:
			case 118:
			case 119:
			case 120:
			case 121:
			case 122:
			case 123:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 1152;
				this.pluralDateTimePrecision();
				}
				break;
			case 165:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 1153;
				this.match(tricc_cqlParser.STRING);
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

	public sempred(localctx: RuleContext, ruleIndex: number, predIndex: number): boolean {
		switch (ruleIndex) {
		case 1:
			return this.expression_sempred(localctx as ExpressionContext, predIndex);
		case 2:
			return this.expressionTerm_sempred(localctx as ExpressionTermContext, predIndex);
		case 66:
			return this.simplePath_sempred(localctx as SimplePathContext, predIndex);
		}
		return true;
	}
	private expression_sempred(localctx: ExpressionContext, predIndex: number): boolean {
		switch (predIndex) {
		case 0:
			return this.precpred(this._ctx, 8);
		case 1:
			return this.precpred(this._ctx, 7);
		case 2:
			return this.precpred(this._ctx, 6);
		case 3:
			return this.precpred(this._ctx, 5);
		case 4:
			return this.precpred(this._ctx, 4);
		case 5:
			return this.precpred(this._ctx, 3);
		case 6:
			return this.precpred(this._ctx, 2);
		case 7:
			return this.precpred(this._ctx, 1);
		case 8:
			return this.precpred(this._ctx, 14);
		case 9:
			return this.precpred(this._ctx, 13);
		case 10:
			return this.precpred(this._ctx, 9);
		}
		return true;
	}
	private expressionTerm_sempred(localctx: ExpressionTermContext, predIndex: number): boolean {
		switch (predIndex) {
		case 11:
			return this.precpred(this._ctx, 7);
		case 12:
			return this.precpred(this._ctx, 6);
		case 13:
			return this.precpred(this._ctx, 5);
		}
		return true;
	}
	private simplePath_sempred(localctx: SimplePathContext, predIndex: number): boolean {
		switch (predIndex) {
		case 14:
			return this.precpred(this._ctx, 2);
		case 15:
			return this.precpred(this._ctx, 1);
		}
		return true;
	}

	public static readonly _serializedATN: number[] = [4,1,169,1157,2,0,7,0,
	2,1,7,1,2,2,7,2,2,3,7,3,2,4,7,4,2,5,7,5,2,6,7,6,2,7,7,7,2,8,7,8,2,9,7,9,
	2,10,7,10,2,11,7,11,2,12,7,12,2,13,7,13,2,14,7,14,2,15,7,15,2,16,7,16,2,
	17,7,17,2,18,7,18,2,19,7,19,2,20,7,20,2,21,7,21,2,22,7,22,2,23,7,23,2,24,
	7,24,2,25,7,25,2,26,7,26,2,27,7,27,2,28,7,28,2,29,7,29,2,30,7,30,2,31,7,
	31,2,32,7,32,2,33,7,33,2,34,7,34,2,35,7,35,2,36,7,36,2,37,7,37,2,38,7,38,
	2,39,7,39,2,40,7,40,2,41,7,41,2,42,7,42,2,43,7,43,2,44,7,44,2,45,7,45,2,
	46,7,46,2,47,7,47,2,48,7,48,2,49,7,49,2,50,7,50,2,51,7,51,2,52,7,52,2,53,
	7,53,2,54,7,54,2,55,7,55,2,56,7,56,2,57,7,57,2,58,7,58,2,59,7,59,2,60,7,
	60,2,61,7,61,2,62,7,62,2,63,7,63,2,64,7,64,2,65,7,65,2,66,7,66,2,67,7,67,
	2,68,7,68,2,69,7,69,2,70,7,70,2,71,7,71,2,72,7,72,2,73,7,73,2,74,7,74,2,
	75,7,75,2,76,7,76,2,77,7,77,2,78,7,78,2,79,7,79,2,80,7,80,2,81,7,81,2,82,
	7,82,2,83,7,83,2,84,7,84,2,85,7,85,2,86,7,86,2,87,7,87,2,88,7,88,2,89,7,
	89,2,90,7,90,2,91,7,91,2,92,7,92,2,93,7,93,2,94,7,94,2,95,7,95,2,96,7,96,
	2,97,7,97,2,98,7,98,2,99,7,99,2,100,7,100,2,101,7,101,2,102,7,102,2,103,
	7,103,2,104,7,104,2,105,7,105,2,106,7,106,1,0,1,0,1,0,1,1,1,1,1,1,1,1,1,
	1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,229,8,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
	1,1,1,1,1,1,1,1,1,3,1,244,8,1,1,1,1,1,1,1,1,1,1,1,3,1,251,8,1,1,1,1,1,1,
	1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,266,8,1,1,1,1,1,1,1,1,1,1,
	1,1,1,3,1,274,8,1,1,1,1,1,1,1,1,1,1,1,5,1,281,8,1,10,1,12,1,284,9,1,1,2,
	1,2,1,2,1,2,1,2,1,2,1,2,3,2,293,8,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,
	1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,
	1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,3,2,330,8,2,1,2,4,2,333,8,2,11,2,12,2,334,
	1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,3,2,348,8,2,3,2,350,8,2,3,2,
	352,8,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,5,2,363,8,2,10,2,12,2,366,9,
	2,1,3,1,3,1,3,1,3,1,3,1,3,1,3,1,3,1,3,1,3,1,3,1,3,1,3,1,3,3,3,382,8,3,1,
	4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,3,4,392,8,4,1,5,1,5,1,5,1,5,1,5,1,5,1,5,3,
	5,401,8,5,1,6,3,6,404,8,6,1,6,5,6,407,8,6,10,6,12,6,410,9,6,1,6,5,6,413,
	8,6,10,6,12,6,416,9,6,1,6,1,6,1,7,1,7,1,7,1,7,3,7,424,8,7,1,8,1,8,1,8,1,
	8,3,8,430,8,8,1,8,1,8,3,8,434,8,8,1,9,1,9,1,9,1,9,3,9,440,8,9,1,9,1,9,3,
	9,444,8,9,1,10,1,10,1,11,1,11,1,12,3,12,451,8,12,1,12,1,12,1,12,3,12,456,
	8,12,1,12,1,12,3,12,460,8,12,1,13,3,13,463,8,13,1,13,1,13,1,13,1,13,1,13,
	1,13,3,13,471,8,13,1,14,3,14,474,8,14,1,14,1,14,1,14,1,14,1,14,1,14,3,14,
	482,8,14,1,14,3,14,485,8,14,1,15,1,15,1,15,1,15,1,15,5,15,492,8,15,10,15,
	12,15,495,9,15,1,15,1,15,1,16,1,16,1,16,3,16,502,8,16,1,16,1,16,1,17,1,
	17,1,18,3,18,509,8,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,3,18,518,8,18,
	1,19,3,19,521,8,19,1,19,1,19,1,19,1,19,1,19,1,19,1,19,5,19,530,8,19,10,
	19,12,19,533,9,19,1,19,1,19,3,19,537,8,19,1,20,1,20,1,20,3,20,542,8,20,
	1,20,1,20,1,21,1,21,1,22,1,22,1,23,1,23,1,24,1,24,1,25,1,25,1,25,1,25,1,
	25,3,25,559,8,25,1,26,1,26,1,26,5,26,564,8,26,10,26,12,26,567,9,26,1,26,
	1,26,1,27,1,27,1,28,1,28,1,28,1,28,1,28,1,29,1,29,1,29,1,29,1,29,1,30,1,
	30,1,30,1,30,1,30,5,30,588,8,30,10,30,12,30,591,9,30,1,30,1,30,1,31,1,31,
	1,31,1,32,1,32,1,32,1,32,1,32,5,32,603,8,32,10,32,12,32,606,9,32,1,32,1,
	32,1,33,1,33,1,33,3,33,613,8,33,1,34,1,34,3,34,617,8,34,1,34,1,34,1,34,
	1,34,1,35,1,35,1,35,1,35,3,35,627,8,35,1,35,1,35,1,36,1,36,1,37,1,37,3,
	37,635,8,37,1,37,3,37,638,8,37,1,37,1,37,1,37,1,37,1,37,1,37,5,37,646,8,
	37,10,37,12,37,649,9,37,3,37,651,8,37,1,37,1,37,1,37,3,37,656,8,37,1,37,
	1,37,1,37,3,37,661,8,37,1,38,1,38,1,38,1,39,1,39,1,40,1,40,1,40,1,40,1,
	40,1,40,3,40,674,8,40,1,41,1,41,1,41,1,42,1,42,1,43,1,43,3,43,683,8,43,
	1,44,1,44,1,44,1,44,1,44,1,45,1,45,1,45,1,45,1,45,1,46,1,46,1,46,1,46,3,
	46,699,8,46,1,46,1,46,1,46,1,46,1,46,3,46,706,8,46,1,46,3,46,709,8,46,1,
	46,1,46,1,47,1,47,1,48,1,48,1,49,1,49,1,50,1,50,3,50,721,8,50,1,51,1,51,
	1,52,1,52,3,52,727,8,52,1,52,5,52,730,8,52,10,52,12,52,733,9,52,1,52,3,
	52,736,8,52,1,52,1,52,3,52,740,8,52,1,52,3,52,743,8,52,1,53,3,53,746,8,
	53,1,53,1,53,1,53,5,53,751,8,53,10,53,12,53,754,9,53,1,54,1,54,1,54,1,54,
	5,54,760,8,54,10,54,12,54,763,9,54,1,55,1,55,1,55,1,55,1,56,1,56,1,56,1,
	57,1,57,3,57,774,8,57,1,57,1,57,1,58,1,58,3,58,780,8,58,1,58,1,58,3,58,
	784,8,58,1,58,1,58,1,58,1,59,1,59,1,59,1,59,1,59,1,59,1,59,3,59,796,8,59,
	1,60,1,60,1,60,1,60,1,60,1,60,5,60,804,8,60,10,60,12,60,807,9,60,3,60,809,
	8,60,1,61,1,61,1,62,1,62,3,62,815,8,62,1,63,1,63,1,63,5,63,820,8,63,10,
	63,12,63,823,9,63,1,63,1,63,1,64,1,64,1,64,5,64,830,8,64,10,64,12,64,833,
	9,64,1,64,1,64,1,65,1,65,1,66,1,66,1,66,1,66,1,66,1,66,1,66,1,66,1,66,1,
	66,1,66,5,66,850,8,66,10,66,12,66,853,9,66,1,67,1,67,3,67,857,8,67,1,68,
	1,68,1,69,1,69,1,69,1,69,1,69,3,69,866,8,69,1,70,1,70,1,71,1,71,1,71,1,
	71,1,71,1,72,1,72,1,72,1,73,1,73,1,74,1,74,1,75,1,75,1,76,1,76,3,76,886,
	8,76,1,76,1,76,1,76,3,76,891,8,76,1,77,3,77,894,8,77,1,77,1,77,1,77,3,77,
	899,8,77,3,77,901,8,77,1,78,3,78,904,8,78,1,78,1,78,3,78,908,8,78,1,78,
	1,78,3,78,912,8,78,1,78,3,78,915,8,78,1,78,3,78,918,8,78,1,78,1,78,3,78,
	922,8,78,1,78,3,78,925,8,78,1,78,3,78,928,8,78,1,78,3,78,931,8,78,1,78,
	1,78,3,78,935,8,78,1,78,3,78,938,8,78,1,78,3,78,941,8,78,1,78,1,78,3,78,
	945,8,78,1,78,3,78,948,8,78,1,78,3,78,951,8,78,1,78,3,78,954,8,78,1,78,
	1,78,1,78,1,78,3,78,960,8,78,1,78,1,78,3,78,964,8,78,1,78,3,78,967,8,78,
	1,78,1,78,3,78,971,8,78,1,78,3,78,974,8,78,1,78,1,78,3,78,978,8,78,1,78,
	1,78,3,78,982,8,78,3,78,984,8,78,1,79,1,79,3,79,988,8,79,1,80,1,80,1,80,
	3,80,993,8,80,1,80,1,80,1,81,1,81,1,81,1,81,1,81,3,81,1002,8,81,1,82,1,
	82,1,82,3,82,1007,8,82,1,82,1,82,1,83,1,83,1,83,1,83,1,84,1,84,1,84,1,84,
	3,84,1019,8,84,1,85,1,85,1,85,1,85,1,85,1,85,1,85,1,86,3,86,1029,8,86,1,
	86,1,86,1,86,1,86,1,86,5,86,1036,8,86,10,86,12,86,1039,9,86,3,86,1041,8,
	86,1,86,1,86,1,87,1,87,1,87,1,87,1,88,1,88,1,88,1,88,1,88,1,88,5,88,1055,
	8,88,10,88,12,88,1058,9,88,3,88,1060,8,88,1,88,1,88,1,89,1,89,1,89,1,89,
	1,90,1,90,1,90,1,90,1,90,3,90,1073,8,90,3,90,1075,8,90,1,90,1,90,1,90,1,
	90,5,90,1081,8,90,10,90,12,90,1084,9,90,3,90,1086,8,90,1,90,1,90,1,91,1,
	91,1,91,1,92,1,92,1,92,1,92,1,92,3,92,1098,8,92,1,93,1,93,1,93,1,93,1,93,
	5,93,1105,8,93,10,93,12,93,1108,9,93,1,93,1,93,3,93,1112,8,93,1,94,1,94,
	1,95,1,95,1,96,1,96,1,97,1,97,1,98,1,98,1,99,1,99,1,100,1,100,3,100,1128,
	8,100,1,101,1,101,3,101,1132,8,101,1,102,1,102,3,102,1136,8,102,1,103,1,
	103,1,104,1,104,1,104,5,104,1143,8,104,10,104,12,104,1146,9,104,1,105,1,
	105,3,105,1150,8,105,1,106,1,106,1,106,3,106,1155,8,106,1,106,0,3,2,4,132,
	107,0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,
	48,50,52,54,56,58,60,62,64,66,68,70,72,74,76,78,80,82,84,86,88,90,92,94,
	96,98,100,102,104,106,108,110,112,114,116,118,120,122,124,126,128,130,132,
	134,136,138,140,142,144,146,148,150,152,154,156,158,160,162,164,166,168,
	170,172,174,176,178,180,182,184,186,188,190,192,194,196,198,200,202,204,
	206,208,210,212,0,35,1,0,12,15,1,0,16,19,1,0,20,21,1,0,22,23,1,0,3,5,2,
	0,1,1,6,6,1,0,27,28,1,0,29,30,1,0,38,39,1,0,50,51,1,0,52,53,1,0,41,44,2,
	0,27,28,45,45,1,0,4,5,1,0,62,63,3,0,16,16,18,18,20,20,2,0,50,50,95,95,1,
	0,100,103,1,0,104,111,1,0,116,123,1,0,125,126,1,0,127,128,1,0,129,130,1,
	0,132,133,1,0,135,137,1,0,140,141,2,0,55,55,89,89,2,0,56,56,91,91,13,0,
	1,11,20,26,29,39,43,44,46,54,57,66,68,69,74,78,80,83,86,88,92,128,131,144,
	149,156,18,0,1,11,20,20,22,22,25,26,31,32,36,39,46,54,76,78,86,88,92,92,
	94,96,98,98,104,111,116,124,131,134,137,138,140,142,150,153,19,0,21,21,
	23,24,29,30,33,35,43,44,57,66,68,69,74,75,80,83,93,93,97,97,99,103,112,
	115,125,128,135,136,139,139,143,144,149,149,154,156,11,0,2,2,8,8,21,21,
	29,30,50,50,58,58,74,75,93,93,95,95,112,115,149,151,14,0,1,11,20,26,29,
	39,43,44,46,54,57,66,68,69,74,78,80,83,86,88,92,128,132,133,135,144,149,
	156,2,0,112,113,150,151,2,0,158,158,163,164,1250,0,214,1,0,0,0,2,228,1,
	0,0,0,4,351,1,0,0,0,6,381,1,0,0,0,8,391,1,0,0,0,10,400,1,0,0,0,12,403,1,
	0,0,0,14,419,1,0,0,0,16,425,1,0,0,0,18,435,1,0,0,0,20,445,1,0,0,0,22,447,
	1,0,0,0,24,450,1,0,0,0,26,462,1,0,0,0,28,473,1,0,0,0,30,486,1,0,0,0,32,
	501,1,0,0,0,34,505,1,0,0,0,36,508,1,0,0,0,38,520,1,0,0,0,40,541,1,0,0,0,
	42,545,1,0,0,0,44,547,1,0,0,0,46,549,1,0,0,0,48,551,1,0,0,0,50,558,1,0,
	0,0,52,565,1,0,0,0,54,570,1,0,0,0,56,572,1,0,0,0,58,577,1,0,0,0,60,582,
	1,0,0,0,62,594,1,0,0,0,64,597,1,0,0,0,66,612,1,0,0,0,68,614,1,0,0,0,70,
	622,1,0,0,0,72,630,1,0,0,0,74,632,1,0,0,0,76,662,1,0,0,0,78,665,1,0,0,0,
	80,673,1,0,0,0,82,675,1,0,0,0,84,678,1,0,0,0,86,682,1,0,0,0,88,684,1,0,
	0,0,90,689,1,0,0,0,92,694,1,0,0,0,94,712,1,0,0,0,96,714,1,0,0,0,98,716,
	1,0,0,0,100,720,1,0,0,0,102,722,1,0,0,0,104,724,1,0,0,0,106,745,1,0,0,0,
	108,755,1,0,0,0,110,764,1,0,0,0,112,768,1,0,0,0,114,771,1,0,0,0,116,777,
	1,0,0,0,118,788,1,0,0,0,120,797,1,0,0,0,122,810,1,0,0,0,124,812,1,0,0,0,
	126,821,1,0,0,0,128,831,1,0,0,0,130,836,1,0,0,0,132,838,1,0,0,0,134,856,
	1,0,0,0,136,858,1,0,0,0,138,865,1,0,0,0,140,867,1,0,0,0,142,869,1,0,0,0,
	144,874,1,0,0,0,146,877,1,0,0,0,148,879,1,0,0,0,150,881,1,0,0,0,152,890,
	1,0,0,0,154,900,1,0,0,0,156,983,1,0,0,0,158,987,1,0,0,0,160,989,1,0,0,0,
	162,1001,1,0,0,0,164,1003,1,0,0,0,166,1010,1,0,0,0,168,1014,1,0,0,0,170,
	1020,1,0,0,0,172,1028,1,0,0,0,174,1044,1,0,0,0,176,1048,1,0,0,0,178,1063,
	1,0,0,0,180,1074,1,0,0,0,182,1089,1,0,0,0,184,1092,1,0,0,0,186,1099,1,0,
	0,0,188,1113,1,0,0,0,190,1115,1,0,0,0,192,1117,1,0,0,0,194,1119,1,0,0,0,
	196,1121,1,0,0,0,198,1123,1,0,0,0,200,1127,1,0,0,0,202,1131,1,0,0,0,204,
	1135,1,0,0,0,206,1137,1,0,0,0,208,1139,1,0,0,0,210,1147,1,0,0,0,212,1154,
	1,0,0,0,214,215,3,2,1,0,215,216,5,0,0,1,216,1,1,0,0,0,217,218,6,1,-1,0,
	218,229,3,4,2,0,219,220,5,7,0,0,220,221,3,2,1,0,221,222,5,6,0,0,222,223,
	3,50,25,0,223,229,1,0,0,0,224,225,5,2,0,0,225,229,3,2,1,11,226,227,5,8,
	0,0,227,229,3,2,1,10,228,217,1,0,0,0,228,219,1,0,0,0,228,224,1,0,0,0,228,
	226,1,0,0,0,229,282,1,0,0,0,230,231,10,8,0,0,231,232,7,0,0,0,232,281,3,
	2,1,9,233,234,10,7,0,0,234,235,3,156,78,0,235,236,3,2,1,8,236,281,1,0,0,
	0,237,238,10,6,0,0,238,239,7,1,0,0,239,281,3,2,1,7,240,241,10,5,0,0,241,
	243,7,2,0,0,242,244,3,144,72,0,243,242,1,0,0,0,243,244,1,0,0,0,244,245,
	1,0,0,0,245,281,3,2,1,6,246,247,10,4,0,0,247,248,5,2,0,0,248,250,7,2,0,
	0,249,251,3,144,72,0,250,249,1,0,0,0,250,251,1,0,0,0,251,252,1,0,0,0,252,
	281,3,2,1,5,253,254,10,3,0,0,254,255,5,11,0,0,255,281,3,2,1,4,256,257,10,
	2,0,0,257,258,7,3,0,0,258,281,3,2,1,3,259,260,10,1,0,0,260,261,5,24,0,0,
	261,281,3,2,1,2,262,263,10,14,0,0,263,265,5,1,0,0,264,266,5,2,0,0,265,264,
	1,0,0,0,265,266,1,0,0,0,266,267,1,0,0,0,267,281,7,4,0,0,268,269,10,13,0,
	0,269,270,7,5,0,0,270,281,3,50,25,0,271,273,10,9,0,0,272,274,5,9,0,0,273,
	272,1,0,0,0,273,274,1,0,0,0,274,275,1,0,0,0,275,276,5,10,0,0,276,277,3,
	4,2,0,277,278,5,11,0,0,278,279,3,4,2,0,279,281,1,0,0,0,280,230,1,0,0,0,
	280,233,1,0,0,0,280,237,1,0,0,0,280,240,1,0,0,0,280,246,1,0,0,0,280,253,
	1,0,0,0,280,256,1,0,0,0,280,259,1,0,0,0,280,262,1,0,0,0,280,268,1,0,0,0,
	280,271,1,0,0,0,281,284,1,0,0,0,282,280,1,0,0,0,282,283,1,0,0,0,283,3,1,
	0,0,0,284,282,1,0,0,0,285,286,6,2,-1,0,286,352,3,6,3,0,287,288,5,25,0,0,
	288,289,3,2,1,0,289,292,5,26,0,0,290,293,3,50,25,0,291,293,3,212,106,0,
	292,290,1,0,0,0,292,291,1,0,0,0,293,352,1,0,0,0,294,295,7,6,0,0,295,352,
	3,4,2,16,296,297,7,7,0,0,297,298,5,31,0,0,298,352,3,4,2,15,299,300,3,138,
	69,0,300,301,5,32,0,0,301,302,3,4,2,14,302,352,1,0,0,0,303,304,5,33,0,0,
	304,305,5,31,0,0,305,352,3,4,2,13,306,307,5,34,0,0,307,308,5,31,0,0,308,
	352,3,4,2,12,309,310,5,35,0,0,310,311,5,31,0,0,311,352,3,4,2,11,312,313,
	5,36,0,0,313,314,5,32,0,0,314,352,3,4,2,10,315,316,5,37,0,0,316,317,5,32,
	0,0,317,352,3,4,2,9,318,319,7,8,0,0,319,352,3,52,26,0,320,321,5,46,0,0,
	321,322,3,2,1,0,322,323,5,47,0,0,323,324,3,2,1,0,324,325,5,48,0,0,325,326,
	3,2,1,0,326,352,1,0,0,0,327,329,5,49,0,0,328,330,3,2,1,0,329,328,1,0,0,
	0,329,330,1,0,0,0,330,332,1,0,0,0,331,333,3,142,71,0,332,331,1,0,0,0,333,
	334,1,0,0,0,334,332,1,0,0,0,334,335,1,0,0,0,335,336,1,0,0,0,336,337,5,48,
	0,0,337,338,3,2,1,0,338,339,5,30,0,0,339,352,1,0,0,0,340,341,7,9,0,0,341,
	352,3,2,1,0,342,343,7,10,0,0,343,349,3,2,1,0,344,347,5,54,0,0,345,348,3,
	136,68,0,346,348,3,2,1,0,347,345,1,0,0,0,347,346,1,0,0,0,348,350,1,0,0,
	0,349,344,1,0,0,0,349,350,1,0,0,0,350,352,1,0,0,0,351,285,1,0,0,0,351,287,
	1,0,0,0,351,294,1,0,0,0,351,296,1,0,0,0,351,299,1,0,0,0,351,303,1,0,0,0,
	351,306,1,0,0,0,351,309,1,0,0,0,351,312,1,0,0,0,351,315,1,0,0,0,351,318,
	1,0,0,0,351,320,1,0,0,0,351,327,1,0,0,0,351,340,1,0,0,0,351,342,1,0,0,0,
	352,364,1,0,0,0,353,354,10,7,0,0,354,355,5,40,0,0,355,363,3,4,2,8,356,357,
	10,6,0,0,357,358,7,11,0,0,358,363,3,4,2,7,359,360,10,5,0,0,360,361,7,12,
	0,0,361,363,3,4,2,6,362,353,1,0,0,0,362,356,1,0,0,0,362,359,1,0,0,0,363,
	366,1,0,0,0,364,362,1,0,0,0,364,365,1,0,0,0,365,5,1,0,0,0,366,364,1,0,0,
	0,367,382,3,162,81,0,368,382,3,8,4,0,369,382,3,168,84,0,370,382,3,170,85,
	0,371,382,3,172,86,0,372,382,3,176,88,0,373,382,3,180,90,0,374,382,3,184,
	92,0,375,382,3,186,93,0,376,377,5,55,0,0,377,378,3,2,1,0,378,379,5,56,0,
	0,379,382,1,0,0,0,380,382,5,157,0,0,381,367,1,0,0,0,381,368,1,0,0,0,381,
	369,1,0,0,0,381,370,1,0,0,0,381,371,1,0,0,0,381,372,1,0,0,0,381,373,1,0,
	0,0,381,374,1,0,0,0,381,375,1,0,0,0,381,376,1,0,0,0,381,380,1,0,0,0,382,
	7,1,0,0,0,383,392,7,13,0,0,384,392,5,3,0,0,385,392,5,165,0,0,386,392,5,
	166,0,0,387,392,5,160,0,0,388,392,5,159,0,0,389,392,5,161,0,0,390,392,5,
	162,0,0,391,383,1,0,0,0,391,384,1,0,0,0,391,385,1,0,0,0,391,386,1,0,0,0,
	391,387,1,0,0,0,391,388,1,0,0,0,391,389,1,0,0,0,391,390,1,0,0,0,392,9,1,
	0,0,0,393,401,3,16,8,0,394,401,3,18,9,0,395,401,3,26,13,0,396,401,3,28,
	14,0,397,401,3,36,18,0,398,401,3,38,19,0,399,401,3,24,12,0,400,393,1,0,
	0,0,400,394,1,0,0,0,400,395,1,0,0,0,400,396,1,0,0,0,400,397,1,0,0,0,400,
	398,1,0,0,0,400,399,1,0,0,0,401,11,1,0,0,0,402,404,3,14,7,0,403,402,1,0,
	0,0,403,404,1,0,0,0,404,408,1,0,0,0,405,407,3,10,5,0,406,405,1,0,0,0,407,
	410,1,0,0,0,408,406,1,0,0,0,408,409,1,0,0,0,409,414,1,0,0,0,410,408,1,0,
	0,0,411,413,3,66,33,0,412,411,1,0,0,0,413,416,1,0,0,0,414,412,1,0,0,0,414,
	415,1,0,0,0,415,417,1,0,0,0,416,414,1,0,0,0,417,418,5,0,0,1,418,13,1,0,
	0,0,419,420,5,57,0,0,420,423,3,126,63,0,421,422,5,58,0,0,422,424,3,46,23,
	0,423,421,1,0,0,0,423,424,1,0,0,0,424,15,1,0,0,0,425,426,5,59,0,0,426,429,
	3,126,63,0,427,428,5,58,0,0,428,430,3,46,23,0,429,427,1,0,0,0,429,430,1,
	0,0,0,430,433,1,0,0,0,431,432,5,60,0,0,432,434,3,20,10,0,433,431,1,0,0,
	0,433,434,1,0,0,0,434,17,1,0,0,0,435,436,5,61,0,0,436,439,3,126,63,0,437,
	438,5,58,0,0,438,440,3,46,23,0,439,437,1,0,0,0,439,440,1,0,0,0,440,443,
	1,0,0,0,441,442,5,60,0,0,442,444,3,20,10,0,443,441,1,0,0,0,443,444,1,0,
	0,0,444,19,1,0,0,0,445,446,3,206,103,0,446,21,1,0,0,0,447,448,7,14,0,0,
	448,23,1,0,0,0,449,451,3,22,11,0,450,449,1,0,0,0,450,451,1,0,0,0,451,452,
	1,0,0,0,452,453,5,64,0,0,453,455,3,206,103,0,454,456,3,50,25,0,455,454,
	1,0,0,0,455,456,1,0,0,0,456,459,1,0,0,0,457,458,5,65,0,0,458,460,3,2,1,
	0,459,457,1,0,0,0,459,460,1,0,0,0,460,25,1,0,0,0,461,463,3,22,11,0,462,
	461,1,0,0,0,462,463,1,0,0,0,463,464,1,0,0,0,464,465,5,66,0,0,465,466,3,
	206,103,0,466,467,5,67,0,0,467,470,3,42,21,0,468,469,5,58,0,0,469,471,3,
	46,23,0,470,468,1,0,0,0,470,471,1,0,0,0,471,27,1,0,0,0,472,474,3,22,11,
	0,473,472,1,0,0,0,473,474,1,0,0,0,474,475,1,0,0,0,475,476,5,68,0,0,476,
	477,3,206,103,0,477,478,5,67,0,0,478,481,3,44,22,0,479,480,5,58,0,0,480,
	482,3,46,23,0,481,479,1,0,0,0,481,482,1,0,0,0,482,484,1,0,0,0,483,485,3,
	30,15,0,484,483,1,0,0,0,484,485,1,0,0,0,485,29,1,0,0,0,486,487,5,69,0,0,
	487,488,5,70,0,0,488,493,3,32,16,0,489,490,5,71,0,0,490,492,3,32,16,0,491,
	489,1,0,0,0,492,495,1,0,0,0,493,491,1,0,0,0,493,494,1,0,0,0,494,496,1,0,
	0,0,495,493,1,0,0,0,496,497,5,72,0,0,497,31,1,0,0,0,498,499,3,34,17,0,499,
	500,5,73,0,0,500,502,1,0,0,0,501,498,1,0,0,0,501,502,1,0,0,0,502,503,1,
	0,0,0,503,504,3,206,103,0,504,33,1,0,0,0,505,506,3,206,103,0,506,35,1,0,
	0,0,507,509,3,22,11,0,508,507,1,0,0,0,508,509,1,0,0,0,509,510,1,0,0,0,510,
	511,5,74,0,0,511,512,3,206,103,0,512,513,5,67,0,0,513,514,3,48,24,0,514,
	515,5,32,0,0,515,517,3,32,16,0,516,518,3,182,91,0,517,516,1,0,0,0,517,518,
	1,0,0,0,518,37,1,0,0,0,519,521,3,22,11,0,520,519,1,0,0,0,520,521,1,0,0,
	0,521,522,1,0,0,0,522,523,5,75,0,0,523,524,3,206,103,0,524,525,5,67,0,0,
	525,526,5,70,0,0,526,531,3,40,20,0,527,528,5,71,0,0,528,530,3,40,20,0,529,
	527,1,0,0,0,530,533,1,0,0,0,531,529,1,0,0,0,531,532,1,0,0,0,532,534,1,0,
	0,0,533,531,1,0,0,0,534,536,5,72,0,0,535,537,3,182,91,0,536,535,1,0,0,0,
	536,537,1,0,0,0,537,39,1,0,0,0,538,539,3,34,17,0,539,540,5,73,0,0,540,542,
	1,0,0,0,541,538,1,0,0,0,541,542,1,0,0,0,542,543,1,0,0,0,543,544,3,206,103,
	0,544,41,1,0,0,0,545,546,5,165,0,0,546,43,1,0,0,0,547,548,5,165,0,0,548,
	45,1,0,0,0,549,550,5,165,0,0,550,47,1,0,0,0,551,552,5,165,0,0,552,49,1,
	0,0,0,553,559,3,52,26,0,554,559,3,56,28,0,555,559,3,58,29,0,556,559,3,60,
	30,0,557,559,3,64,32,0,558,553,1,0,0,0,558,554,1,0,0,0,558,555,1,0,0,0,
	558,556,1,0,0,0,558,557,1,0,0,0,559,51,1,0,0,0,560,561,3,102,51,0,561,562,
	5,73,0,0,562,564,1,0,0,0,563,560,1,0,0,0,564,567,1,0,0,0,565,563,1,0,0,
	0,565,566,1,0,0,0,566,568,1,0,0,0,567,565,1,0,0,0,568,569,3,202,101,0,569,
	53,1,0,0,0,570,571,3,206,103,0,571,55,1,0,0,0,572,573,5,76,0,0,573,574,
	5,13,0,0,574,575,3,50,25,0,575,576,5,14,0,0,576,57,1,0,0,0,577,578,5,77,
	0,0,578,579,5,13,0,0,579,580,3,50,25,0,580,581,5,14,0,0,581,59,1,0,0,0,
	582,583,5,78,0,0,583,584,5,70,0,0,584,589,3,62,31,0,585,586,5,71,0,0,586,
	588,3,62,31,0,587,585,1,0,0,0,588,591,1,0,0,0,589,587,1,0,0,0,589,590,1,
	0,0,0,590,592,1,0,0,0,591,589,1,0,0,0,592,593,5,72,0,0,593,61,1,0,0,0,594,
	595,3,200,100,0,595,596,3,50,25,0,596,63,1,0,0,0,597,598,5,79,0,0,598,599,
	5,13,0,0,599,604,3,50,25,0,600,601,5,71,0,0,601,603,3,50,25,0,602,600,1,
	0,0,0,603,606,1,0,0,0,604,602,1,0,0,0,604,605,1,0,0,0,605,607,1,0,0,0,606,
	604,1,0,0,0,607,608,5,14,0,0,608,65,1,0,0,0,609,613,3,68,34,0,610,613,3,
	70,35,0,611,613,3,74,37,0,612,609,1,0,0,0,612,610,1,0,0,0,612,611,1,0,0,
	0,613,67,1,0,0,0,614,616,5,80,0,0,615,617,3,22,11,0,616,615,1,0,0,0,616,
	617,1,0,0,0,617,618,1,0,0,0,618,619,3,206,103,0,619,620,5,67,0,0,620,621,
	3,2,1,0,621,69,1,0,0,0,622,626,5,81,0,0,623,624,3,54,27,0,624,625,5,73,
	0,0,625,627,1,0,0,0,626,623,1,0,0,0,626,627,1,0,0,0,627,628,1,0,0,0,628,
	629,3,206,103,0,629,71,1,0,0,0,630,631,5,82,0,0,631,73,1,0,0,0,632,634,
	5,80,0,0,633,635,3,22,11,0,634,633,1,0,0,0,634,635,1,0,0,0,635,637,1,0,
	0,0,636,638,3,72,36,0,637,636,1,0,0,0,637,638,1,0,0,0,638,639,1,0,0,0,639,
	640,5,83,0,0,640,641,3,204,102,0,641,650,5,55,0,0,642,647,3,76,38,0,643,
	644,5,71,0,0,644,646,3,76,38,0,645,643,1,0,0,0,646,649,1,0,0,0,647,645,
	1,0,0,0,647,648,1,0,0,0,648,651,1,0,0,0,649,647,1,0,0,0,650,642,1,0,0,0,
	650,651,1,0,0,0,651,652,1,0,0,0,652,655,5,56,0,0,653,654,5,84,0,0,654,656,
	3,50,25,0,655,653,1,0,0,0,655,656,1,0,0,0,656,657,1,0,0,0,657,660,5,67,
	0,0,658,661,3,78,39,0,659,661,5,85,0,0,660,658,1,0,0,0,660,659,1,0,0,0,
	661,75,1,0,0,0,662,663,3,200,100,0,663,664,3,50,25,0,664,77,1,0,0,0,665,
	666,3,2,1,0,666,79,1,0,0,0,667,674,3,92,46,0,668,674,3,128,64,0,669,670,
	5,55,0,0,670,671,3,2,1,0,671,672,5,56,0,0,672,674,1,0,0,0,673,667,1,0,0,
	0,673,668,1,0,0,0,673,669,1,0,0,0,674,81,1,0,0,0,675,676,3,80,40,0,676,
	677,3,84,42,0,677,83,1,0,0,0,678,679,3,206,103,0,679,85,1,0,0,0,680,683,
	3,88,44,0,681,683,3,90,45,0,682,680,1,0,0,0,682,681,1,0,0,0,683,87,1,0,
	0,0,684,685,5,86,0,0,685,686,3,82,41,0,686,687,5,87,0,0,687,688,3,2,1,0,
	688,89,1,0,0,0,689,690,5,88,0,0,690,691,3,82,41,0,691,692,5,87,0,0,692,
	693,3,2,1,0,693,91,1,0,0,0,694,698,5,89,0,0,695,696,3,94,47,0,696,697,5,
	90,0,0,697,699,1,0,0,0,698,695,1,0,0,0,698,699,1,0,0,0,699,700,1,0,0,0,
	700,708,3,52,26,0,701,705,5,67,0,0,702,703,3,96,48,0,703,704,3,98,49,0,
	704,706,1,0,0,0,705,702,1,0,0,0,705,706,1,0,0,0,706,707,1,0,0,0,707,709,
	3,100,50,0,708,701,1,0,0,0,708,709,1,0,0,0,709,710,1,0,0,0,710,711,5,91,
	0,0,711,93,1,0,0,0,712,713,3,128,64,0,713,95,1,0,0,0,714,715,3,132,66,0,
	715,97,1,0,0,0,716,717,7,15,0,0,717,99,1,0,0,0,718,721,3,128,64,0,719,721,
	3,2,1,0,720,718,1,0,0,0,720,719,1,0,0,0,721,101,1,0,0,0,722,723,3,206,103,
	0,723,103,1,0,0,0,724,726,3,106,53,0,725,727,3,108,54,0,726,725,1,0,0,0,
	726,727,1,0,0,0,727,731,1,0,0,0,728,730,3,86,43,0,729,728,1,0,0,0,730,733,
	1,0,0,0,731,729,1,0,0,0,731,732,1,0,0,0,732,735,1,0,0,0,733,731,1,0,0,0,
	734,736,3,112,56,0,735,734,1,0,0,0,735,736,1,0,0,0,736,739,1,0,0,0,737,
	740,3,116,58,0,738,740,3,114,57,0,739,737,1,0,0,0,739,738,1,0,0,0,739,740,
	1,0,0,0,740,742,1,0,0,0,741,743,3,120,60,0,742,741,1,0,0,0,742,743,1,0,
	0,0,743,105,1,0,0,0,744,746,5,32,0,0,745,744,1,0,0,0,745,746,1,0,0,0,746,
	747,1,0,0,0,747,752,3,82,41,0,748,749,5,71,0,0,749,751,3,82,41,0,750,748,
	1,0,0,0,751,754,1,0,0,0,752,750,1,0,0,0,752,753,1,0,0,0,753,107,1,0,0,0,
	754,752,1,0,0,0,755,756,5,92,0,0,756,761,3,110,55,0,757,758,5,71,0,0,758,
	760,3,110,55,0,759,757,1,0,0,0,760,763,1,0,0,0,761,759,1,0,0,0,761,762,
	1,0,0,0,762,109,1,0,0,0,763,761,1,0,0,0,764,765,3,206,103,0,765,766,5,67,
	0,0,766,767,3,2,1,0,767,111,1,0,0,0,768,769,5,93,0,0,769,770,3,2,1,0,770,
	113,1,0,0,0,771,773,5,94,0,0,772,774,7,16,0,0,773,772,1,0,0,0,773,774,1,
	0,0,0,774,775,1,0,0,0,775,776,3,2,1,0,776,115,1,0,0,0,777,779,5,96,0,0,
	778,780,7,16,0,0,779,778,1,0,0,0,779,780,1,0,0,0,780,781,1,0,0,0,781,783,
	3,206,103,0,782,784,3,118,59,0,783,782,1,0,0,0,783,784,1,0,0,0,784,785,
	1,0,0,0,785,786,5,67,0,0,786,787,3,2,1,0,787,117,1,0,0,0,788,795,5,97,0,
	0,789,796,3,134,67,0,790,796,3,210,105,0,791,792,5,55,0,0,792,793,3,2,1,
	0,793,794,5,56,0,0,794,796,1,0,0,0,795,789,1,0,0,0,795,790,1,0,0,0,795,
	791,1,0,0,0,796,119,1,0,0,0,797,808,5,98,0,0,798,809,3,122,61,0,799,800,
	5,99,0,0,800,805,3,124,62,0,801,802,5,71,0,0,802,804,3,124,62,0,803,801,
	1,0,0,0,804,807,1,0,0,0,805,803,1,0,0,0,805,806,1,0,0,0,806,809,1,0,0,0,
	807,805,1,0,0,0,808,798,1,0,0,0,808,799,1,0,0,0,809,121,1,0,0,0,810,811,
	7,17,0,0,811,123,1,0,0,0,812,814,3,4,2,0,813,815,3,122,61,0,814,813,1,0,
	0,0,814,815,1,0,0,0,815,125,1,0,0,0,816,817,3,102,51,0,817,818,5,73,0,0,
	818,820,1,0,0,0,819,816,1,0,0,0,820,823,1,0,0,0,821,819,1,0,0,0,821,822,
	1,0,0,0,822,824,1,0,0,0,823,821,1,0,0,0,824,825,3,206,103,0,825,127,1,0,
	0,0,826,827,3,130,65,0,827,828,5,73,0,0,828,830,1,0,0,0,829,826,1,0,0,0,
	830,833,1,0,0,0,831,829,1,0,0,0,831,832,1,0,0,0,832,834,1,0,0,0,833,831,
	1,0,0,0,834,835,3,200,100,0,835,129,1,0,0,0,836,837,3,200,100,0,837,131,
	1,0,0,0,838,839,6,66,-1,0,839,840,3,200,100,0,840,851,1,0,0,0,841,842,10,
	2,0,0,842,843,5,73,0,0,843,850,3,200,100,0,844,845,10,1,0,0,845,846,5,89,
	0,0,846,847,3,134,67,0,847,848,5,91,0,0,848,850,1,0,0,0,849,841,1,0,0,0,
	849,844,1,0,0,0,850,853,1,0,0,0,851,849,1,0,0,0,851,852,1,0,0,0,852,133,
	1,0,0,0,853,851,1,0,0,0,854,857,5,165,0,0,855,857,5,166,0,0,856,854,1,0,
	0,0,856,855,1,0,0,0,857,135,1,0,0,0,858,859,7,18,0,0,859,137,1,0,0,0,860,
	866,3,136,68,0,861,866,5,112,0,0,862,866,5,113,0,0,863,866,5,114,0,0,864,
	866,5,115,0,0,865,860,1,0,0,0,865,861,1,0,0,0,865,862,1,0,0,0,865,863,1,
	0,0,0,865,864,1,0,0,0,866,139,1,0,0,0,867,868,7,19,0,0,868,141,1,0,0,0,
	869,870,5,124,0,0,870,871,3,2,1,0,871,872,5,47,0,0,872,873,3,2,1,0,873,
	143,1,0,0,0,874,875,3,136,68,0,875,876,5,31,0,0,876,145,1,0,0,0,877,878,
	7,20,0,0,878,147,1,0,0,0,879,880,7,21,0,0,880,149,1,0,0,0,881,882,7,22,
	0,0,882,151,1,0,0,0,883,885,3,210,105,0,884,886,3,148,74,0,885,884,1,0,
	0,0,885,886,1,0,0,0,886,891,1,0,0,0,887,888,3,150,75,0,888,889,3,210,105,
	0,889,891,1,0,0,0,890,883,1,0,0,0,890,887,1,0,0,0,891,153,1,0,0,0,892,894,
	5,131,0,0,893,892,1,0,0,0,893,894,1,0,0,0,894,895,1,0,0,0,895,901,7,23,
	0,0,896,898,7,23,0,0,897,899,5,134,0,0,898,897,1,0,0,0,898,899,1,0,0,0,
	899,901,1,0,0,0,900,893,1,0,0,0,900,896,1,0,0,0,901,155,1,0,0,0,902,904,
	7,24,0,0,903,902,1,0,0,0,903,904,1,0,0,0,904,905,1,0,0,0,905,907,5,138,
	0,0,906,908,3,136,68,0,907,906,1,0,0,0,907,908,1,0,0,0,908,911,1,0,0,0,
	909,912,3,146,73,0,910,912,5,6,0,0,911,909,1,0,0,0,911,910,1,0,0,0,912,
	914,1,0,0,0,913,915,7,7,0,0,914,913,1,0,0,0,914,915,1,0,0,0,915,984,1,0,
	0,0,916,918,5,9,0,0,917,916,1,0,0,0,917,918,1,0,0,0,918,919,1,0,0,0,919,
	921,5,139,0,0,920,922,3,144,72,0,921,920,1,0,0,0,921,922,1,0,0,0,922,924,
	1,0,0,0,923,925,7,7,0,0,924,923,1,0,0,0,924,925,1,0,0,0,925,984,1,0,0,0,
	926,928,7,24,0,0,927,926,1,0,0,0,927,928,1,0,0,0,928,930,1,0,0,0,929,931,
	5,9,0,0,930,929,1,0,0,0,930,931,1,0,0,0,931,932,1,0,0,0,932,934,7,25,0,
	0,933,935,3,144,72,0,934,933,1,0,0,0,934,935,1,0,0,0,935,984,1,0,0,0,936,
	938,7,24,0,0,937,936,1,0,0,0,937,938,1,0,0,0,938,940,1,0,0,0,939,941,3,
	152,76,0,940,939,1,0,0,0,940,941,1,0,0,0,941,942,1,0,0,0,942,944,3,154,
	77,0,943,945,3,144,72,0,944,943,1,0,0,0,944,945,1,0,0,0,945,947,1,0,0,0,
	946,948,7,7,0,0,947,946,1,0,0,0,947,948,1,0,0,0,948,984,1,0,0,0,949,951,
	7,24,0,0,950,949,1,0,0,0,950,951,1,0,0,0,951,953,1,0,0,0,952,954,5,9,0,
	0,953,952,1,0,0,0,953,954,1,0,0,0,954,955,1,0,0,0,955,956,5,142,0,0,956,
	957,3,210,105,0,957,959,5,31,0,0,958,960,7,7,0,0,959,958,1,0,0,0,959,960,
	1,0,0,0,960,984,1,0,0,0,961,963,5,143,0,0,962,964,7,23,0,0,963,962,1,0,
	0,0,963,964,1,0,0,0,964,966,1,0,0,0,965,967,3,144,72,0,966,965,1,0,0,0,
	966,967,1,0,0,0,967,984,1,0,0,0,968,970,5,144,0,0,969,971,7,23,0,0,970,
	969,1,0,0,0,970,971,1,0,0,0,971,973,1,0,0,0,972,974,3,144,72,0,973,972,
	1,0,0,0,973,974,1,0,0,0,974,984,1,0,0,0,975,977,5,135,0,0,976,978,3,144,
	72,0,977,976,1,0,0,0,977,978,1,0,0,0,978,984,1,0,0,0,979,981,5,136,0,0,
	980,982,3,144,72,0,981,980,1,0,0,0,981,982,1,0,0,0,982,984,1,0,0,0,983,
	903,1,0,0,0,983,917,1,0,0,0,983,927,1,0,0,0,983,937,1,0,0,0,983,950,1,0,
	0,0,983,961,1,0,0,0,983,968,1,0,0,0,983,975,1,0,0,0,983,979,1,0,0,0,984,
	157,1,0,0,0,985,988,3,200,100,0,986,988,3,160,80,0,987,985,1,0,0,0,987,
	986,1,0,0,0,988,159,1,0,0,0,989,990,3,204,102,0,990,992,5,55,0,0,991,993,
	3,208,104,0,992,991,1,0,0,0,992,993,1,0,0,0,993,994,1,0,0,0,994,995,5,56,
	0,0,995,161,1,0,0,0,996,1002,3,200,100,0,997,1002,3,164,82,0,998,1002,5,
	145,0,0,999,1002,5,146,0,0,1000,1002,5,147,0,0,1001,996,1,0,0,0,1001,997,
	1,0,0,0,1001,998,1,0,0,0,1001,999,1,0,0,0,1001,1000,1,0,0,0,1002,163,1,
	0,0,0,1003,1004,3,200,100,0,1004,1006,5,55,0,0,1005,1007,3,208,104,0,1006,
	1005,1,0,0,0,1006,1007,1,0,0,0,1007,1008,1,0,0,0,1008,1009,5,56,0,0,1009,
	165,1,0,0,0,1010,1011,3,210,105,0,1011,1012,5,67,0,0,1012,1013,3,210,105,
	0,1013,167,1,0,0,0,1014,1018,5,148,0,0,1015,1019,3,192,96,0,1016,1019,3,
	206,103,0,1017,1019,5,165,0,0,1018,1015,1,0,0,0,1018,1016,1,0,0,0,1018,
	1017,1,0,0,0,1019,169,1,0,0,0,1020,1021,5,77,0,0,1021,1022,7,26,0,0,1022,
	1023,3,2,1,0,1023,1024,5,71,0,0,1024,1025,3,2,1,0,1025,1026,7,27,0,0,1026,
	171,1,0,0,0,1027,1029,5,78,0,0,1028,1027,1,0,0,0,1028,1029,1,0,0,0,1029,
	1030,1,0,0,0,1030,1040,5,70,0,0,1031,1041,5,67,0,0,1032,1037,3,174,87,0,
	1033,1034,5,71,0,0,1034,1036,3,174,87,0,1035,1033,1,0,0,0,1036,1039,1,0,
	0,0,1037,1035,1,0,0,0,1037,1038,1,0,0,0,1038,1041,1,0,0,0,1039,1037,1,0,
	0,0,1040,1031,1,0,0,0,1040,1032,1,0,0,0,1041,1042,1,0,0,0,1042,1043,5,72,
	0,0,1043,173,1,0,0,0,1044,1045,3,200,100,0,1045,1046,5,67,0,0,1046,1047,
	3,2,1,0,1047,175,1,0,0,0,1048,1049,3,52,26,0,1049,1059,5,70,0,0,1050,1060,
	5,67,0,0,1051,1056,3,178,89,0,1052,1053,5,71,0,0,1053,1055,3,178,89,0,1054,
	1052,1,0,0,0,1055,1058,1,0,0,0,1056,1054,1,0,0,0,1056,1057,1,0,0,0,1057,
	1060,1,0,0,0,1058,1056,1,0,0,0,1059,1050,1,0,0,0,1059,1051,1,0,0,0,1060,
	1061,1,0,0,0,1061,1062,5,72,0,0,1062,177,1,0,0,0,1063,1064,3,200,100,0,
	1064,1065,5,67,0,0,1065,1066,3,2,1,0,1066,179,1,0,0,0,1067,1072,5,76,0,
	0,1068,1069,5,13,0,0,1069,1070,3,50,25,0,1070,1071,5,14,0,0,1071,1073,1,
	0,0,0,1072,1068,1,0,0,0,1072,1073,1,0,0,0,1073,1075,1,0,0,0,1074,1067,1,
	0,0,0,1074,1075,1,0,0,0,1075,1076,1,0,0,0,1076,1085,5,70,0,0,1077,1082,
	3,2,1,0,1078,1079,5,71,0,0,1079,1081,3,2,1,0,1080,1078,1,0,0,0,1081,1084,
	1,0,0,0,1082,1080,1,0,0,0,1082,1083,1,0,0,0,1083,1086,1,0,0,0,1084,1082,
	1,0,0,0,1085,1077,1,0,0,0,1085,1086,1,0,0,0,1086,1087,1,0,0,0,1087,1088,
	5,72,0,0,1088,181,1,0,0,0,1089,1090,5,149,0,0,1090,1091,5,165,0,0,1091,
	183,1,0,0,0,1092,1093,5,150,0,0,1093,1094,5,165,0,0,1094,1095,5,32,0,0,
	1095,1097,3,32,16,0,1096,1098,3,182,91,0,1097,1096,1,0,0,0,1097,1098,1,
	0,0,0,1098,185,1,0,0,0,1099,1100,5,151,0,0,1100,1101,5,70,0,0,1101,1106,
	3,184,92,0,1102,1103,5,71,0,0,1103,1105,3,184,92,0,1104,1102,1,0,0,0,1105,
	1108,1,0,0,0,1106,1104,1,0,0,0,1106,1107,1,0,0,0,1107,1109,1,0,0,0,1108,
	1106,1,0,0,0,1109,1111,5,72,0,0,1110,1112,3,182,91,0,1111,1110,1,0,0,0,
	1111,1112,1,0,0,0,1112,187,1,0,0,0,1113,1114,7,28,0,0,1114,189,1,0,0,0,
	1115,1116,7,29,0,0,1116,191,1,0,0,0,1117,1118,7,30,0,0,1118,193,1,0,0,0,
	1119,1120,7,31,0,0,1120,195,1,0,0,0,1121,1122,7,32,0,0,1122,197,1,0,0,0,
	1123,1124,7,33,0,0,1124,199,1,0,0,0,1125,1128,3,206,103,0,1126,1128,3,192,
	96,0,1127,1125,1,0,0,0,1127,1126,1,0,0,0,1128,201,1,0,0,0,1129,1132,3,200,
	100,0,1130,1132,3,198,99,0,1131,1129,1,0,0,0,1131,1130,1,0,0,0,1132,203,
	1,0,0,0,1133,1136,3,206,103,0,1134,1136,3,196,98,0,1135,1133,1,0,0,0,1135,
	1134,1,0,0,0,1136,205,1,0,0,0,1137,1138,7,34,0,0,1138,207,1,0,0,0,1139,
	1144,3,2,1,0,1140,1141,5,71,0,0,1141,1143,3,2,1,0,1142,1140,1,0,0,0,1143,
	1146,1,0,0,0,1144,1142,1,0,0,0,1144,1145,1,0,0,0,1145,209,1,0,0,0,1146,
	1144,1,0,0,0,1147,1149,5,166,0,0,1148,1150,3,212,106,0,1149,1148,1,0,0,
	0,1149,1150,1,0,0,0,1150,211,1,0,0,0,1151,1155,3,136,68,0,1152,1155,3,140,
	70,0,1153,1155,5,165,0,0,1154,1151,1,0,0,0,1154,1152,1,0,0,0,1154,1153,
	1,0,0,0,1155,213,1,0,0,0,134,228,243,250,265,273,280,282,292,329,334,347,
	349,351,362,364,381,391,400,403,408,414,423,429,433,439,443,450,455,459,
	462,470,473,481,484,493,501,508,517,520,531,536,541,558,565,589,604,612,
	616,626,634,637,647,650,655,660,673,682,698,705,708,720,726,731,735,739,
	742,745,752,761,773,779,783,795,805,808,814,821,831,849,851,856,865,885,
	890,893,898,900,903,907,911,914,917,921,924,927,930,934,937,940,944,947,
	950,953,959,963,966,970,973,977,981,983,987,992,1001,1006,1018,1028,1037,
	1040,1056,1059,1072,1074,1082,1085,1097,1106,1111,1127,1131,1135,1144,1149,
	1154];

	private static __ATN: ATN;
	public static get _ATN(): ATN {
		if (!tricc_cqlParser.__ATN) {
			tricc_cqlParser.__ATN = new ATNDeserializer().deserialize(tricc_cqlParser._serializedATN);
		}

		return tricc_cqlParser.__ATN;
	}


	static DecisionsToDFA = tricc_cqlParser._ATN.decisionToState.map( (ds: DecisionState, index: number) => new DFA(ds, index) );

}

export class TriccExpressionContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public EOF(): TerminalNode {
		return this.getToken(tricc_cqlParser.EOF, 0);
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_triccExpression;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitTriccExpression) {
			return visitor.visitTriccExpression(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ExpressionContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_expression;
	}
	public override copyFrom(ctx: ExpressionContext): void {
		super.copyFrom(ctx);
	}
}
export class TimingExpressionContext extends ExpressionContext {
	constructor(parser: tricc_cqlParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public intervalOperatorPhrase(): IntervalOperatorPhraseContext {
		return this.getTypedRuleContext(IntervalOperatorPhraseContext, 0) as IntervalOperatorPhraseContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitTimingExpression) {
			return visitor.visitTimingExpression(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class NotExpressionContext extends ExpressionContext {
	constructor(parser: tricc_cqlParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitNotExpression) {
			return visitor.visitNotExpression(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class BooleanExpressionContext extends ExpressionContext {
	constructor(parser: tricc_cqlParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitBooleanExpression) {
			return visitor.visitBooleanExpression(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class OrExpressionContext extends ExpressionContext {
	constructor(parser: tricc_cqlParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitOrExpression) {
			return visitor.visitOrExpression(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class CastExpressionContext extends ExpressionContext {
	constructor(parser: tricc_cqlParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public typeSpecifier(): TypeSpecifierContext {
		return this.getTypedRuleContext(TypeSpecifierContext, 0) as TypeSpecifierContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitCastExpression) {
			return visitor.visitCastExpression(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class AndExpressionContext extends ExpressionContext {
	constructor(parser: tricc_cqlParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitAndExpression) {
			return visitor.visitAndExpression(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class BetweenExpressionContext extends ExpressionContext {
	constructor(parser: tricc_cqlParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public expressionTerm_list(): ExpressionTermContext[] {
		return this.getTypedRuleContexts(ExpressionTermContext) as ExpressionTermContext[];
	}
	public expressionTerm(i: number): ExpressionTermContext {
		return this.getTypedRuleContext(ExpressionTermContext, i) as ExpressionTermContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitBetweenExpression) {
			return visitor.visitBetweenExpression(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class MembershipExpressionContext extends ExpressionContext {
	constructor(parser: tricc_cqlParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public dateTimePrecisionSpecifier(): DateTimePrecisionSpecifierContext {
		return this.getTypedRuleContext(DateTimePrecisionSpecifierContext, 0) as DateTimePrecisionSpecifierContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitMembershipExpression) {
			return visitor.visitMembershipExpression(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class InequalityExpressionContext extends ExpressionContext {
	constructor(parser: tricc_cqlParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitInequalityExpression) {
			return visitor.visitInequalityExpression(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class EqualityExpressionContext extends ExpressionContext {
	constructor(parser: tricc_cqlParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitEqualityExpression) {
			return visitor.visitEqualityExpression(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class ExistenceExpressionContext extends ExpressionContext {
	constructor(parser: tricc_cqlParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitExistenceExpression) {
			return visitor.visitExistenceExpression(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class ImpliesExpressionContext extends ExpressionContext {
	constructor(parser: tricc_cqlParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitImpliesExpression) {
			return visitor.visitImpliesExpression(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class NegateMembershipExpressionContext extends ExpressionContext {
	constructor(parser: tricc_cqlParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public dateTimePrecisionSpecifier(): DateTimePrecisionSpecifierContext {
		return this.getTypedRuleContext(DateTimePrecisionSpecifierContext, 0) as DateTimePrecisionSpecifierContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitNegateMembershipExpression) {
			return visitor.visitNegateMembershipExpression(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class TermExpressionContext extends ExpressionContext {
	constructor(parser: tricc_cqlParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expressionTerm(): ExpressionTermContext {
		return this.getTypedRuleContext(ExpressionTermContext, 0) as ExpressionTermContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitTermExpression) {
			return visitor.visitTermExpression(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class TypeExpressionContext extends ExpressionContext {
	constructor(parser: tricc_cqlParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public typeSpecifier(): TypeSpecifierContext {
		return this.getTypedRuleContext(TypeSpecifierContext, 0) as TypeSpecifierContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitTypeExpression) {
			return visitor.visitTypeExpression(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ExpressionTermContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_expressionTerm;
	}
	public override copyFrom(ctx: ExpressionTermContext): void {
		super.copyFrom(ctx);
	}
}
export class AdditionExpressionTermContext extends ExpressionTermContext {
	constructor(parser: tricc_cqlParser, ctx: ExpressionTermContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expressionTerm_list(): ExpressionTermContext[] {
		return this.getTypedRuleContexts(ExpressionTermContext) as ExpressionTermContext[];
	}
	public expressionTerm(i: number): ExpressionTermContext {
		return this.getTypedRuleContext(ExpressionTermContext, i) as ExpressionTermContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitAdditionExpressionTerm) {
			return visitor.visitAdditionExpressionTerm(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class WidthExpressionTermContext extends ExpressionTermContext {
	constructor(parser: tricc_cqlParser, ctx: ExpressionTermContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expressionTerm(): ExpressionTermContext {
		return this.getTypedRuleContext(ExpressionTermContext, 0) as ExpressionTermContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitWidthExpressionTerm) {
			return visitor.visitWidthExpressionTerm(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class SetAggregateExpressionTermContext extends ExpressionTermContext {
	constructor(parser: tricc_cqlParser, ctx: ExpressionTermContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public dateTimePrecision(): DateTimePrecisionContext {
		return this.getTypedRuleContext(DateTimePrecisionContext, 0) as DateTimePrecisionContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitSetAggregateExpressionTerm) {
			return visitor.visitSetAggregateExpressionTerm(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class TimeUnitExpressionTermContext extends ExpressionTermContext {
	constructor(parser: tricc_cqlParser, ctx: ExpressionTermContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public dateTimeComponent(): DateTimeComponentContext {
		return this.getTypedRuleContext(DateTimeComponentContext, 0) as DateTimeComponentContext;
	}
	public expressionTerm(): ExpressionTermContext {
		return this.getTypedRuleContext(ExpressionTermContext, 0) as ExpressionTermContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitTimeUnitExpressionTerm) {
			return visitor.visitTimeUnitExpressionTerm(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class IfThenElseExpressionTermContext extends ExpressionTermContext {
	constructor(parser: tricc_cqlParser, ctx: ExpressionTermContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitIfThenElseExpressionTerm) {
			return visitor.visitIfThenElseExpressionTerm(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class TimeBoundaryExpressionTermContext extends ExpressionTermContext {
	constructor(parser: tricc_cqlParser, ctx: ExpressionTermContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expressionTerm(): ExpressionTermContext {
		return this.getTypedRuleContext(ExpressionTermContext, 0) as ExpressionTermContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitTimeBoundaryExpressionTerm) {
			return visitor.visitTimeBoundaryExpressionTerm(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class ElementExtractorExpressionTermContext extends ExpressionTermContext {
	constructor(parser: tricc_cqlParser, ctx: ExpressionTermContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expressionTerm(): ExpressionTermContext {
		return this.getTypedRuleContext(ExpressionTermContext, 0) as ExpressionTermContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitElementExtractorExpressionTerm) {
			return visitor.visitElementExtractorExpressionTerm(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class ConversionExpressionTermContext extends ExpressionTermContext {
	constructor(parser: tricc_cqlParser, ctx: ExpressionTermContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public typeSpecifier(): TypeSpecifierContext {
		return this.getTypedRuleContext(TypeSpecifierContext, 0) as TypeSpecifierContext;
	}
	public unit(): UnitContext {
		return this.getTypedRuleContext(UnitContext, 0) as UnitContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitConversionExpressionTerm) {
			return visitor.visitConversionExpressionTerm(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class TypeExtentExpressionTermContext extends ExpressionTermContext {
	constructor(parser: tricc_cqlParser, ctx: ExpressionTermContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public namedTypeSpecifier(): NamedTypeSpecifierContext {
		return this.getTypedRuleContext(NamedTypeSpecifierContext, 0) as NamedTypeSpecifierContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitTypeExtentExpressionTerm) {
			return visitor.visitTypeExtentExpressionTerm(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class PredecessorExpressionTermContext extends ExpressionTermContext {
	constructor(parser: tricc_cqlParser, ctx: ExpressionTermContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expressionTerm(): ExpressionTermContext {
		return this.getTypedRuleContext(ExpressionTermContext, 0) as ExpressionTermContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitPredecessorExpressionTerm) {
			return visitor.visitPredecessorExpressionTerm(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class PointExtractorExpressionTermContext extends ExpressionTermContext {
	constructor(parser: tricc_cqlParser, ctx: ExpressionTermContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expressionTerm(): ExpressionTermContext {
		return this.getTypedRuleContext(ExpressionTermContext, 0) as ExpressionTermContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitPointExtractorExpressionTerm) {
			return visitor.visitPointExtractorExpressionTerm(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class MultiplicationExpressionTermContext extends ExpressionTermContext {
	constructor(parser: tricc_cqlParser, ctx: ExpressionTermContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expressionTerm_list(): ExpressionTermContext[] {
		return this.getTypedRuleContexts(ExpressionTermContext) as ExpressionTermContext[];
	}
	public expressionTerm(i: number): ExpressionTermContext {
		return this.getTypedRuleContext(ExpressionTermContext, i) as ExpressionTermContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitMultiplicationExpressionTerm) {
			return visitor.visitMultiplicationExpressionTerm(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class AggregateExpressionTermContext extends ExpressionTermContext {
	constructor(parser: tricc_cqlParser, ctx: ExpressionTermContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitAggregateExpressionTerm) {
			return visitor.visitAggregateExpressionTerm(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class CaseExpressionTermContext extends ExpressionTermContext {
	constructor(parser: tricc_cqlParser, ctx: ExpressionTermContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public caseExpressionItem_list(): CaseExpressionItemContext[] {
		return this.getTypedRuleContexts(CaseExpressionItemContext) as CaseExpressionItemContext[];
	}
	public caseExpressionItem(i: number): CaseExpressionItemContext {
		return this.getTypedRuleContext(CaseExpressionItemContext, i) as CaseExpressionItemContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitCaseExpressionTerm) {
			return visitor.visitCaseExpressionTerm(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class PowerExpressionTermContext extends ExpressionTermContext {
	constructor(parser: tricc_cqlParser, ctx: ExpressionTermContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expressionTerm_list(): ExpressionTermContext[] {
		return this.getTypedRuleContexts(ExpressionTermContext) as ExpressionTermContext[];
	}
	public expressionTerm(i: number): ExpressionTermContext {
		return this.getTypedRuleContext(ExpressionTermContext, i) as ExpressionTermContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitPowerExpressionTerm) {
			return visitor.visitPowerExpressionTerm(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class SuccessorExpressionTermContext extends ExpressionTermContext {
	constructor(parser: tricc_cqlParser, ctx: ExpressionTermContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expressionTerm(): ExpressionTermContext {
		return this.getTypedRuleContext(ExpressionTermContext, 0) as ExpressionTermContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitSuccessorExpressionTerm) {
			return visitor.visitSuccessorExpressionTerm(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class PolarityExpressionTermContext extends ExpressionTermContext {
	constructor(parser: tricc_cqlParser, ctx: ExpressionTermContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expressionTerm(): ExpressionTermContext {
		return this.getTypedRuleContext(ExpressionTermContext, 0) as ExpressionTermContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitPolarityExpressionTerm) {
			return visitor.visitPolarityExpressionTerm(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class TermExpressionTermContext extends ExpressionTermContext {
	constructor(parser: tricc_cqlParser, ctx: ExpressionTermContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public term(): TermContext {
		return this.getTypedRuleContext(TermContext, 0) as TermContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitTermExpressionTerm) {
			return visitor.visitTermExpressionTerm(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class TermContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_term;
	}
	public override copyFrom(ctx: TermContext): void {
		super.copyFrom(ctx);
	}
}
export class ExternalConstantTermContext extends TermContext {
	constructor(parser: tricc_cqlParser, ctx: TermContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public externalConstant(): ExternalConstantContext {
		return this.getTypedRuleContext(ExternalConstantContext, 0) as ExternalConstantContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitExternalConstantTerm) {
			return visitor.visitExternalConstantTerm(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class TupleSelectorTermContext extends TermContext {
	constructor(parser: tricc_cqlParser, ctx: TermContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public tupleSelector(): TupleSelectorContext {
		return this.getTypedRuleContext(TupleSelectorContext, 0) as TupleSelectorContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitTupleSelectorTerm) {
			return visitor.visitTupleSelectorTerm(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class LiteralTermContext extends TermContext {
	constructor(parser: tricc_cqlParser, ctx: TermContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public literal(): LiteralContext {
		return this.getTypedRuleContext(LiteralContext, 0) as LiteralContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitLiteralTerm) {
			return visitor.visitLiteralTerm(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class ConceptSelectorTermContext extends TermContext {
	constructor(parser: tricc_cqlParser, ctx: TermContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public conceptSelector(): ConceptSelectorContext {
		return this.getTypedRuleContext(ConceptSelectorContext, 0) as ConceptSelectorContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitConceptSelectorTerm) {
			return visitor.visitConceptSelectorTerm(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class ParenthesizedTermContext extends TermContext {
	constructor(parser: tricc_cqlParser, ctx: TermContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitParenthesizedTerm) {
			return visitor.visitParenthesizedTerm(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class PlaceholderTermContext extends TermContext {
	constructor(parser: tricc_cqlParser, ctx: TermContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public PLACEHOLDER(): TerminalNode {
		return this.getToken(tricc_cqlParser.PLACEHOLDER, 0);
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitPlaceholderTerm) {
			return visitor.visitPlaceholderTerm(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class CodeSelectorTermContext extends TermContext {
	constructor(parser: tricc_cqlParser, ctx: TermContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public codeSelector(): CodeSelectorContext {
		return this.getTypedRuleContext(CodeSelectorContext, 0) as CodeSelectorContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitCodeSelectorTerm) {
			return visitor.visitCodeSelectorTerm(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class InvocationTermContext extends TermContext {
	constructor(parser: tricc_cqlParser, ctx: TermContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public invocation(): InvocationContext {
		return this.getTypedRuleContext(InvocationContext, 0) as InvocationContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitInvocationTerm) {
			return visitor.visitInvocationTerm(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class InstanceSelectorTermContext extends TermContext {
	constructor(parser: tricc_cqlParser, ctx: TermContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public instanceSelector(): InstanceSelectorContext {
		return this.getTypedRuleContext(InstanceSelectorContext, 0) as InstanceSelectorContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitInstanceSelectorTerm) {
			return visitor.visitInstanceSelectorTerm(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class IntervalSelectorTermContext extends TermContext {
	constructor(parser: tricc_cqlParser, ctx: TermContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public intervalSelector(): IntervalSelectorContext {
		return this.getTypedRuleContext(IntervalSelectorContext, 0) as IntervalSelectorContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitIntervalSelectorTerm) {
			return visitor.visitIntervalSelectorTerm(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class ListSelectorTermContext extends TermContext {
	constructor(parser: tricc_cqlParser, ctx: TermContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public listSelector(): ListSelectorContext {
		return this.getTypedRuleContext(ListSelectorContext, 0) as ListSelectorContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitListSelectorTerm) {
			return visitor.visitListSelectorTerm(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class LiteralContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_literal;
	}
	public override copyFrom(ctx: LiteralContext): void {
		super.copyFrom(ctx);
	}
}
export class TimeLiteralContext extends LiteralContext {
	constructor(parser: tricc_cqlParser, ctx: LiteralContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public TIME(): TerminalNode {
		return this.getToken(tricc_cqlParser.TIME, 0);
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitTimeLiteral) {
			return visitor.visitTimeLiteral(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class NullLiteralContext extends LiteralContext {
	constructor(parser: tricc_cqlParser, ctx: LiteralContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitNullLiteral) {
			return visitor.visitNullLiteral(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class DateTimeLiteralContext extends LiteralContext {
	constructor(parser: tricc_cqlParser, ctx: LiteralContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public DATETIME(): TerminalNode {
		return this.getToken(tricc_cqlParser.DATETIME, 0);
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitDateTimeLiteral) {
			return visitor.visitDateTimeLiteral(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class StringLiteralContext extends LiteralContext {
	constructor(parser: tricc_cqlParser, ctx: LiteralContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public STRING(): TerminalNode {
		return this.getToken(tricc_cqlParser.STRING, 0);
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitStringLiteral) {
			return visitor.visitStringLiteral(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class DateLiteralContext extends LiteralContext {
	constructor(parser: tricc_cqlParser, ctx: LiteralContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public DATE(): TerminalNode {
		return this.getToken(tricc_cqlParser.DATE, 0);
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitDateLiteral) {
			return visitor.visitDateLiteral(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class BooleanLiteralContext extends LiteralContext {
	constructor(parser: tricc_cqlParser, ctx: LiteralContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitBooleanLiteral) {
			return visitor.visitBooleanLiteral(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class NumberLiteralContext extends LiteralContext {
	constructor(parser: tricc_cqlParser, ctx: LiteralContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public NUMBER(): TerminalNode {
		return this.getToken(tricc_cqlParser.NUMBER, 0);
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitNumberLiteral) {
			return visitor.visitNumberLiteral(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class LongNumberLiteralContext extends LiteralContext {
	constructor(parser: tricc_cqlParser, ctx: LiteralContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public LONGNUMBER(): TerminalNode {
		return this.getToken(tricc_cqlParser.LONGNUMBER, 0);
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitLongNumberLiteral) {
			return visitor.visitLongNumberLiteral(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class DefinitionContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public usingDefinition(): UsingDefinitionContext {
		return this.getTypedRuleContext(UsingDefinitionContext, 0) as UsingDefinitionContext;
	}
	public includeDefinition(): IncludeDefinitionContext {
		return this.getTypedRuleContext(IncludeDefinitionContext, 0) as IncludeDefinitionContext;
	}
	public codesystemDefinition(): CodesystemDefinitionContext {
		return this.getTypedRuleContext(CodesystemDefinitionContext, 0) as CodesystemDefinitionContext;
	}
	public valuesetDefinition(): ValuesetDefinitionContext {
		return this.getTypedRuleContext(ValuesetDefinitionContext, 0) as ValuesetDefinitionContext;
	}
	public codeDefinition(): CodeDefinitionContext {
		return this.getTypedRuleContext(CodeDefinitionContext, 0) as CodeDefinitionContext;
	}
	public conceptDefinition(): ConceptDefinitionContext {
		return this.getTypedRuleContext(ConceptDefinitionContext, 0) as ConceptDefinitionContext;
	}
	public parameterDefinition(): ParameterDefinitionContext {
		return this.getTypedRuleContext(ParameterDefinitionContext, 0) as ParameterDefinitionContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_definition;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitDefinition) {
			return visitor.visitDefinition(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class LibraryContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public EOF(): TerminalNode {
		return this.getToken(tricc_cqlParser.EOF, 0);
	}
	public libraryDefinition(): LibraryDefinitionContext {
		return this.getTypedRuleContext(LibraryDefinitionContext, 0) as LibraryDefinitionContext;
	}
	public definition_list(): DefinitionContext[] {
		return this.getTypedRuleContexts(DefinitionContext) as DefinitionContext[];
	}
	public definition(i: number): DefinitionContext {
		return this.getTypedRuleContext(DefinitionContext, i) as DefinitionContext;
	}
	public statement_list(): StatementContext[] {
		return this.getTypedRuleContexts(StatementContext) as StatementContext[];
	}
	public statement(i: number): StatementContext {
		return this.getTypedRuleContext(StatementContext, i) as StatementContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_library;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitLibrary) {
			return visitor.visitLibrary(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class LibraryDefinitionContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public qualifiedIdentifier(): QualifiedIdentifierContext {
		return this.getTypedRuleContext(QualifiedIdentifierContext, 0) as QualifiedIdentifierContext;
	}
	public versionSpecifier(): VersionSpecifierContext {
		return this.getTypedRuleContext(VersionSpecifierContext, 0) as VersionSpecifierContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_libraryDefinition;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitLibraryDefinition) {
			return visitor.visitLibraryDefinition(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class UsingDefinitionContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public qualifiedIdentifier(): QualifiedIdentifierContext {
		return this.getTypedRuleContext(QualifiedIdentifierContext, 0) as QualifiedIdentifierContext;
	}
	public versionSpecifier(): VersionSpecifierContext {
		return this.getTypedRuleContext(VersionSpecifierContext, 0) as VersionSpecifierContext;
	}
	public localIdentifier(): LocalIdentifierContext {
		return this.getTypedRuleContext(LocalIdentifierContext, 0) as LocalIdentifierContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_usingDefinition;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitUsingDefinition) {
			return visitor.visitUsingDefinition(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class IncludeDefinitionContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public qualifiedIdentifier(): QualifiedIdentifierContext {
		return this.getTypedRuleContext(QualifiedIdentifierContext, 0) as QualifiedIdentifierContext;
	}
	public versionSpecifier(): VersionSpecifierContext {
		return this.getTypedRuleContext(VersionSpecifierContext, 0) as VersionSpecifierContext;
	}
	public localIdentifier(): LocalIdentifierContext {
		return this.getTypedRuleContext(LocalIdentifierContext, 0) as LocalIdentifierContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_includeDefinition;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitIncludeDefinition) {
			return visitor.visitIncludeDefinition(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class LocalIdentifierContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public identifier(): IdentifierContext {
		return this.getTypedRuleContext(IdentifierContext, 0) as IdentifierContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_localIdentifier;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitLocalIdentifier) {
			return visitor.visitLocalIdentifier(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class AccessModifierContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_accessModifier;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitAccessModifier) {
			return visitor.visitAccessModifier(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ParameterDefinitionContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public identifier(): IdentifierContext {
		return this.getTypedRuleContext(IdentifierContext, 0) as IdentifierContext;
	}
	public accessModifier(): AccessModifierContext {
		return this.getTypedRuleContext(AccessModifierContext, 0) as AccessModifierContext;
	}
	public typeSpecifier(): TypeSpecifierContext {
		return this.getTypedRuleContext(TypeSpecifierContext, 0) as TypeSpecifierContext;
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_parameterDefinition;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitParameterDefinition) {
			return visitor.visitParameterDefinition(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class CodesystemDefinitionContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public identifier(): IdentifierContext {
		return this.getTypedRuleContext(IdentifierContext, 0) as IdentifierContext;
	}
	public codesystemId(): CodesystemIdContext {
		return this.getTypedRuleContext(CodesystemIdContext, 0) as CodesystemIdContext;
	}
	public accessModifier(): AccessModifierContext {
		return this.getTypedRuleContext(AccessModifierContext, 0) as AccessModifierContext;
	}
	public versionSpecifier(): VersionSpecifierContext {
		return this.getTypedRuleContext(VersionSpecifierContext, 0) as VersionSpecifierContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_codesystemDefinition;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitCodesystemDefinition) {
			return visitor.visitCodesystemDefinition(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ValuesetDefinitionContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public identifier(): IdentifierContext {
		return this.getTypedRuleContext(IdentifierContext, 0) as IdentifierContext;
	}
	public valuesetId(): ValuesetIdContext {
		return this.getTypedRuleContext(ValuesetIdContext, 0) as ValuesetIdContext;
	}
	public accessModifier(): AccessModifierContext {
		return this.getTypedRuleContext(AccessModifierContext, 0) as AccessModifierContext;
	}
	public versionSpecifier(): VersionSpecifierContext {
		return this.getTypedRuleContext(VersionSpecifierContext, 0) as VersionSpecifierContext;
	}
	public codesystems(): CodesystemsContext {
		return this.getTypedRuleContext(CodesystemsContext, 0) as CodesystemsContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_valuesetDefinition;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitValuesetDefinition) {
			return visitor.visitValuesetDefinition(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class CodesystemsContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public codesystemIdentifier_list(): CodesystemIdentifierContext[] {
		return this.getTypedRuleContexts(CodesystemIdentifierContext) as CodesystemIdentifierContext[];
	}
	public codesystemIdentifier(i: number): CodesystemIdentifierContext {
		return this.getTypedRuleContext(CodesystemIdentifierContext, i) as CodesystemIdentifierContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_codesystems;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitCodesystems) {
			return visitor.visitCodesystems(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class CodesystemIdentifierContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public identifier(): IdentifierContext {
		return this.getTypedRuleContext(IdentifierContext, 0) as IdentifierContext;
	}
	public libraryIdentifier(): LibraryIdentifierContext {
		return this.getTypedRuleContext(LibraryIdentifierContext, 0) as LibraryIdentifierContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_codesystemIdentifier;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitCodesystemIdentifier) {
			return visitor.visitCodesystemIdentifier(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class LibraryIdentifierContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public identifier(): IdentifierContext {
		return this.getTypedRuleContext(IdentifierContext, 0) as IdentifierContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_libraryIdentifier;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitLibraryIdentifier) {
			return visitor.visitLibraryIdentifier(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class CodeDefinitionContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public identifier(): IdentifierContext {
		return this.getTypedRuleContext(IdentifierContext, 0) as IdentifierContext;
	}
	public codeId(): CodeIdContext {
		return this.getTypedRuleContext(CodeIdContext, 0) as CodeIdContext;
	}
	public codesystemIdentifier(): CodesystemIdentifierContext {
		return this.getTypedRuleContext(CodesystemIdentifierContext, 0) as CodesystemIdentifierContext;
	}
	public accessModifier(): AccessModifierContext {
		return this.getTypedRuleContext(AccessModifierContext, 0) as AccessModifierContext;
	}
	public displayClause(): DisplayClauseContext {
		return this.getTypedRuleContext(DisplayClauseContext, 0) as DisplayClauseContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_codeDefinition;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitCodeDefinition) {
			return visitor.visitCodeDefinition(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ConceptDefinitionContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public identifier(): IdentifierContext {
		return this.getTypedRuleContext(IdentifierContext, 0) as IdentifierContext;
	}
	public codeIdentifier_list(): CodeIdentifierContext[] {
		return this.getTypedRuleContexts(CodeIdentifierContext) as CodeIdentifierContext[];
	}
	public codeIdentifier(i: number): CodeIdentifierContext {
		return this.getTypedRuleContext(CodeIdentifierContext, i) as CodeIdentifierContext;
	}
	public accessModifier(): AccessModifierContext {
		return this.getTypedRuleContext(AccessModifierContext, 0) as AccessModifierContext;
	}
	public displayClause(): DisplayClauseContext {
		return this.getTypedRuleContext(DisplayClauseContext, 0) as DisplayClauseContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_conceptDefinition;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitConceptDefinition) {
			return visitor.visitConceptDefinition(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class CodeIdentifierContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public identifier(): IdentifierContext {
		return this.getTypedRuleContext(IdentifierContext, 0) as IdentifierContext;
	}
	public libraryIdentifier(): LibraryIdentifierContext {
		return this.getTypedRuleContext(LibraryIdentifierContext, 0) as LibraryIdentifierContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_codeIdentifier;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitCodeIdentifier) {
			return visitor.visitCodeIdentifier(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class CodesystemIdContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public STRING(): TerminalNode {
		return this.getToken(tricc_cqlParser.STRING, 0);
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_codesystemId;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitCodesystemId) {
			return visitor.visitCodesystemId(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ValuesetIdContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public STRING(): TerminalNode {
		return this.getToken(tricc_cqlParser.STRING, 0);
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_valuesetId;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitValuesetId) {
			return visitor.visitValuesetId(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class VersionSpecifierContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public STRING(): TerminalNode {
		return this.getToken(tricc_cqlParser.STRING, 0);
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_versionSpecifier;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitVersionSpecifier) {
			return visitor.visitVersionSpecifier(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class CodeIdContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public STRING(): TerminalNode {
		return this.getToken(tricc_cqlParser.STRING, 0);
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_codeId;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitCodeId) {
			return visitor.visitCodeId(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class TypeSpecifierContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public namedTypeSpecifier(): NamedTypeSpecifierContext {
		return this.getTypedRuleContext(NamedTypeSpecifierContext, 0) as NamedTypeSpecifierContext;
	}
	public listTypeSpecifier(): ListTypeSpecifierContext {
		return this.getTypedRuleContext(ListTypeSpecifierContext, 0) as ListTypeSpecifierContext;
	}
	public intervalTypeSpecifier(): IntervalTypeSpecifierContext {
		return this.getTypedRuleContext(IntervalTypeSpecifierContext, 0) as IntervalTypeSpecifierContext;
	}
	public tupleTypeSpecifier(): TupleTypeSpecifierContext {
		return this.getTypedRuleContext(TupleTypeSpecifierContext, 0) as TupleTypeSpecifierContext;
	}
	public choiceTypeSpecifier(): ChoiceTypeSpecifierContext {
		return this.getTypedRuleContext(ChoiceTypeSpecifierContext, 0) as ChoiceTypeSpecifierContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_typeSpecifier;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitTypeSpecifier) {
			return visitor.visitTypeSpecifier(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class NamedTypeSpecifierContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public referentialOrTypeNameIdentifier(): ReferentialOrTypeNameIdentifierContext {
		return this.getTypedRuleContext(ReferentialOrTypeNameIdentifierContext, 0) as ReferentialOrTypeNameIdentifierContext;
	}
	public qualifier_list(): QualifierContext[] {
		return this.getTypedRuleContexts(QualifierContext) as QualifierContext[];
	}
	public qualifier(i: number): QualifierContext {
		return this.getTypedRuleContext(QualifierContext, i) as QualifierContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_namedTypeSpecifier;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitNamedTypeSpecifier) {
			return visitor.visitNamedTypeSpecifier(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ModelIdentifierContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public identifier(): IdentifierContext {
		return this.getTypedRuleContext(IdentifierContext, 0) as IdentifierContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_modelIdentifier;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitModelIdentifier) {
			return visitor.visitModelIdentifier(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ListTypeSpecifierContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public typeSpecifier(): TypeSpecifierContext {
		return this.getTypedRuleContext(TypeSpecifierContext, 0) as TypeSpecifierContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_listTypeSpecifier;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitListTypeSpecifier) {
			return visitor.visitListTypeSpecifier(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class IntervalTypeSpecifierContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public typeSpecifier(): TypeSpecifierContext {
		return this.getTypedRuleContext(TypeSpecifierContext, 0) as TypeSpecifierContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_intervalTypeSpecifier;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitIntervalTypeSpecifier) {
			return visitor.visitIntervalTypeSpecifier(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class TupleTypeSpecifierContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public tupleElementDefinition_list(): TupleElementDefinitionContext[] {
		return this.getTypedRuleContexts(TupleElementDefinitionContext) as TupleElementDefinitionContext[];
	}
	public tupleElementDefinition(i: number): TupleElementDefinitionContext {
		return this.getTypedRuleContext(TupleElementDefinitionContext, i) as TupleElementDefinitionContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_tupleTypeSpecifier;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitTupleTypeSpecifier) {
			return visitor.visitTupleTypeSpecifier(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class TupleElementDefinitionContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public referentialIdentifier(): ReferentialIdentifierContext {
		return this.getTypedRuleContext(ReferentialIdentifierContext, 0) as ReferentialIdentifierContext;
	}
	public typeSpecifier(): TypeSpecifierContext {
		return this.getTypedRuleContext(TypeSpecifierContext, 0) as TypeSpecifierContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_tupleElementDefinition;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitTupleElementDefinition) {
			return visitor.visitTupleElementDefinition(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ChoiceTypeSpecifierContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public typeSpecifier_list(): TypeSpecifierContext[] {
		return this.getTypedRuleContexts(TypeSpecifierContext) as TypeSpecifierContext[];
	}
	public typeSpecifier(i: number): TypeSpecifierContext {
		return this.getTypedRuleContext(TypeSpecifierContext, i) as TypeSpecifierContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_choiceTypeSpecifier;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitChoiceTypeSpecifier) {
			return visitor.visitChoiceTypeSpecifier(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class StatementContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public expressionDefinition(): ExpressionDefinitionContext {
		return this.getTypedRuleContext(ExpressionDefinitionContext, 0) as ExpressionDefinitionContext;
	}
	public contextDefinition(): ContextDefinitionContext {
		return this.getTypedRuleContext(ContextDefinitionContext, 0) as ContextDefinitionContext;
	}
	public functionDefinition(): FunctionDefinitionContext {
		return this.getTypedRuleContext(FunctionDefinitionContext, 0) as FunctionDefinitionContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_statement;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitStatement) {
			return visitor.visitStatement(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ExpressionDefinitionContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public identifier(): IdentifierContext {
		return this.getTypedRuleContext(IdentifierContext, 0) as IdentifierContext;
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public accessModifier(): AccessModifierContext {
		return this.getTypedRuleContext(AccessModifierContext, 0) as AccessModifierContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_expressionDefinition;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitExpressionDefinition) {
			return visitor.visitExpressionDefinition(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ContextDefinitionContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public identifier(): IdentifierContext {
		return this.getTypedRuleContext(IdentifierContext, 0) as IdentifierContext;
	}
	public modelIdentifier(): ModelIdentifierContext {
		return this.getTypedRuleContext(ModelIdentifierContext, 0) as ModelIdentifierContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_contextDefinition;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitContextDefinition) {
			return visitor.visitContextDefinition(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class FluentModifierContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_fluentModifier;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitFluentModifier) {
			return visitor.visitFluentModifier(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class FunctionDefinitionContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public identifierOrFunctionIdentifier(): IdentifierOrFunctionIdentifierContext {
		return this.getTypedRuleContext(IdentifierOrFunctionIdentifierContext, 0) as IdentifierOrFunctionIdentifierContext;
	}
	public functionBody(): FunctionBodyContext {
		return this.getTypedRuleContext(FunctionBodyContext, 0) as FunctionBodyContext;
	}
	public accessModifier(): AccessModifierContext {
		return this.getTypedRuleContext(AccessModifierContext, 0) as AccessModifierContext;
	}
	public fluentModifier(): FluentModifierContext {
		return this.getTypedRuleContext(FluentModifierContext, 0) as FluentModifierContext;
	}
	public operandDefinition_list(): OperandDefinitionContext[] {
		return this.getTypedRuleContexts(OperandDefinitionContext) as OperandDefinitionContext[];
	}
	public operandDefinition(i: number): OperandDefinitionContext {
		return this.getTypedRuleContext(OperandDefinitionContext, i) as OperandDefinitionContext;
	}
	public typeSpecifier(): TypeSpecifierContext {
		return this.getTypedRuleContext(TypeSpecifierContext, 0) as TypeSpecifierContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_functionDefinition;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitFunctionDefinition) {
			return visitor.visitFunctionDefinition(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class OperandDefinitionContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public referentialIdentifier(): ReferentialIdentifierContext {
		return this.getTypedRuleContext(ReferentialIdentifierContext, 0) as ReferentialIdentifierContext;
	}
	public typeSpecifier(): TypeSpecifierContext {
		return this.getTypedRuleContext(TypeSpecifierContext, 0) as TypeSpecifierContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_operandDefinition;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitOperandDefinition) {
			return visitor.visitOperandDefinition(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class FunctionBodyContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_functionBody;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitFunctionBody) {
			return visitor.visitFunctionBody(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class QuerySourceContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public retrieve(): RetrieveContext {
		return this.getTypedRuleContext(RetrieveContext, 0) as RetrieveContext;
	}
	public qualifiedIdentifierExpression(): QualifiedIdentifierExpressionContext {
		return this.getTypedRuleContext(QualifiedIdentifierExpressionContext, 0) as QualifiedIdentifierExpressionContext;
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_querySource;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitQuerySource) {
			return visitor.visitQuerySource(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class AliasedQuerySourceContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public querySource(): QuerySourceContext {
		return this.getTypedRuleContext(QuerySourceContext, 0) as QuerySourceContext;
	}
	public alias(): AliasContext {
		return this.getTypedRuleContext(AliasContext, 0) as AliasContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_aliasedQuerySource;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitAliasedQuerySource) {
			return visitor.visitAliasedQuerySource(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class AliasContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public identifier(): IdentifierContext {
		return this.getTypedRuleContext(IdentifierContext, 0) as IdentifierContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_alias;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitAlias) {
			return visitor.visitAlias(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class QueryInclusionClauseContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public withClause(): WithClauseContext {
		return this.getTypedRuleContext(WithClauseContext, 0) as WithClauseContext;
	}
	public withoutClause(): WithoutClauseContext {
		return this.getTypedRuleContext(WithoutClauseContext, 0) as WithoutClauseContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_queryInclusionClause;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitQueryInclusionClause) {
			return visitor.visitQueryInclusionClause(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class WithClauseContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public aliasedQuerySource(): AliasedQuerySourceContext {
		return this.getTypedRuleContext(AliasedQuerySourceContext, 0) as AliasedQuerySourceContext;
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_withClause;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitWithClause) {
			return visitor.visitWithClause(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class WithoutClauseContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public aliasedQuerySource(): AliasedQuerySourceContext {
		return this.getTypedRuleContext(AliasedQuerySourceContext, 0) as AliasedQuerySourceContext;
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_withoutClause;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitWithoutClause) {
			return visitor.visitWithoutClause(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class RetrieveContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public namedTypeSpecifier(): NamedTypeSpecifierContext {
		return this.getTypedRuleContext(NamedTypeSpecifierContext, 0) as NamedTypeSpecifierContext;
	}
	public contextIdentifier(): ContextIdentifierContext {
		return this.getTypedRuleContext(ContextIdentifierContext, 0) as ContextIdentifierContext;
	}
	public terminology(): TerminologyContext {
		return this.getTypedRuleContext(TerminologyContext, 0) as TerminologyContext;
	}
	public codePath(): CodePathContext {
		return this.getTypedRuleContext(CodePathContext, 0) as CodePathContext;
	}
	public codeComparator(): CodeComparatorContext {
		return this.getTypedRuleContext(CodeComparatorContext, 0) as CodeComparatorContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_retrieve;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitRetrieve) {
			return visitor.visitRetrieve(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ContextIdentifierContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public qualifiedIdentifierExpression(): QualifiedIdentifierExpressionContext {
		return this.getTypedRuleContext(QualifiedIdentifierExpressionContext, 0) as QualifiedIdentifierExpressionContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_contextIdentifier;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitContextIdentifier) {
			return visitor.visitContextIdentifier(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class CodePathContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public simplePath(): SimplePathContext {
		return this.getTypedRuleContext(SimplePathContext, 0) as SimplePathContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_codePath;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitCodePath) {
			return visitor.visitCodePath(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class CodeComparatorContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_codeComparator;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitCodeComparator) {
			return visitor.visitCodeComparator(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class TerminologyContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public qualifiedIdentifierExpression(): QualifiedIdentifierExpressionContext {
		return this.getTypedRuleContext(QualifiedIdentifierExpressionContext, 0) as QualifiedIdentifierExpressionContext;
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_terminology;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitTerminology) {
			return visitor.visitTerminology(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class QualifierContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public identifier(): IdentifierContext {
		return this.getTypedRuleContext(IdentifierContext, 0) as IdentifierContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_qualifier;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitQualifier) {
			return visitor.visitQualifier(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class QueryContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public sourceClause(): SourceClauseContext {
		return this.getTypedRuleContext(SourceClauseContext, 0) as SourceClauseContext;
	}
	public letClause(): LetClauseContext {
		return this.getTypedRuleContext(LetClauseContext, 0) as LetClauseContext;
	}
	public queryInclusionClause_list(): QueryInclusionClauseContext[] {
		return this.getTypedRuleContexts(QueryInclusionClauseContext) as QueryInclusionClauseContext[];
	}
	public queryInclusionClause(i: number): QueryInclusionClauseContext {
		return this.getTypedRuleContext(QueryInclusionClauseContext, i) as QueryInclusionClauseContext;
	}
	public whereClause(): WhereClauseContext {
		return this.getTypedRuleContext(WhereClauseContext, 0) as WhereClauseContext;
	}
	public aggregateClause(): AggregateClauseContext {
		return this.getTypedRuleContext(AggregateClauseContext, 0) as AggregateClauseContext;
	}
	public returnClause(): ReturnClauseContext {
		return this.getTypedRuleContext(ReturnClauseContext, 0) as ReturnClauseContext;
	}
	public sortClause(): SortClauseContext {
		return this.getTypedRuleContext(SortClauseContext, 0) as SortClauseContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_query;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitQuery) {
			return visitor.visitQuery(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class SourceClauseContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public aliasedQuerySource_list(): AliasedQuerySourceContext[] {
		return this.getTypedRuleContexts(AliasedQuerySourceContext) as AliasedQuerySourceContext[];
	}
	public aliasedQuerySource(i: number): AliasedQuerySourceContext {
		return this.getTypedRuleContext(AliasedQuerySourceContext, i) as AliasedQuerySourceContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_sourceClause;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitSourceClause) {
			return visitor.visitSourceClause(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class LetClauseContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public letClauseItem_list(): LetClauseItemContext[] {
		return this.getTypedRuleContexts(LetClauseItemContext) as LetClauseItemContext[];
	}
	public letClauseItem(i: number): LetClauseItemContext {
		return this.getTypedRuleContext(LetClauseItemContext, i) as LetClauseItemContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_letClause;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitLetClause) {
			return visitor.visitLetClause(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class LetClauseItemContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public identifier(): IdentifierContext {
		return this.getTypedRuleContext(IdentifierContext, 0) as IdentifierContext;
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_letClauseItem;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitLetClauseItem) {
			return visitor.visitLetClauseItem(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class WhereClauseContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_whereClause;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitWhereClause) {
			return visitor.visitWhereClause(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ReturnClauseContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_returnClause;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitReturnClause) {
			return visitor.visitReturnClause(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class AggregateClauseContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public identifier(): IdentifierContext {
		return this.getTypedRuleContext(IdentifierContext, 0) as IdentifierContext;
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public startingClause(): StartingClauseContext {
		return this.getTypedRuleContext(StartingClauseContext, 0) as StartingClauseContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_aggregateClause;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitAggregateClause) {
			return visitor.visitAggregateClause(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class StartingClauseContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public simpleLiteral(): SimpleLiteralContext {
		return this.getTypedRuleContext(SimpleLiteralContext, 0) as SimpleLiteralContext;
	}
	public quantity(): QuantityContext {
		return this.getTypedRuleContext(QuantityContext, 0) as QuantityContext;
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_startingClause;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitStartingClause) {
			return visitor.visitStartingClause(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class SortClauseContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public sortDirection(): SortDirectionContext {
		return this.getTypedRuleContext(SortDirectionContext, 0) as SortDirectionContext;
	}
	public sortByItem_list(): SortByItemContext[] {
		return this.getTypedRuleContexts(SortByItemContext) as SortByItemContext[];
	}
	public sortByItem(i: number): SortByItemContext {
		return this.getTypedRuleContext(SortByItemContext, i) as SortByItemContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_sortClause;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitSortClause) {
			return visitor.visitSortClause(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class SortDirectionContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_sortDirection;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitSortDirection) {
			return visitor.visitSortDirection(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class SortByItemContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public expressionTerm(): ExpressionTermContext {
		return this.getTypedRuleContext(ExpressionTermContext, 0) as ExpressionTermContext;
	}
	public sortDirection(): SortDirectionContext {
		return this.getTypedRuleContext(SortDirectionContext, 0) as SortDirectionContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_sortByItem;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitSortByItem) {
			return visitor.visitSortByItem(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class QualifiedIdentifierContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public identifier(): IdentifierContext {
		return this.getTypedRuleContext(IdentifierContext, 0) as IdentifierContext;
	}
	public qualifier_list(): QualifierContext[] {
		return this.getTypedRuleContexts(QualifierContext) as QualifierContext[];
	}
	public qualifier(i: number): QualifierContext {
		return this.getTypedRuleContext(QualifierContext, i) as QualifierContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_qualifiedIdentifier;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitQualifiedIdentifier) {
			return visitor.visitQualifiedIdentifier(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class QualifiedIdentifierExpressionContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public referentialIdentifier(): ReferentialIdentifierContext {
		return this.getTypedRuleContext(ReferentialIdentifierContext, 0) as ReferentialIdentifierContext;
	}
	public qualifierExpression_list(): QualifierExpressionContext[] {
		return this.getTypedRuleContexts(QualifierExpressionContext) as QualifierExpressionContext[];
	}
	public qualifierExpression(i: number): QualifierExpressionContext {
		return this.getTypedRuleContext(QualifierExpressionContext, i) as QualifierExpressionContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_qualifiedIdentifierExpression;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitQualifiedIdentifierExpression) {
			return visitor.visitQualifiedIdentifierExpression(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class QualifierExpressionContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public referentialIdentifier(): ReferentialIdentifierContext {
		return this.getTypedRuleContext(ReferentialIdentifierContext, 0) as ReferentialIdentifierContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_qualifierExpression;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitQualifierExpression) {
			return visitor.visitQualifierExpression(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class SimplePathContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_simplePath;
	}
	public override copyFrom(ctx: SimplePathContext): void {
		super.copyFrom(ctx);
	}
}
export class SimplePathIndexerContext extends SimplePathContext {
	constructor(parser: tricc_cqlParser, ctx: SimplePathContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public simplePath(): SimplePathContext {
		return this.getTypedRuleContext(SimplePathContext, 0) as SimplePathContext;
	}
	public simpleLiteral(): SimpleLiteralContext {
		return this.getTypedRuleContext(SimpleLiteralContext, 0) as SimpleLiteralContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitSimplePathIndexer) {
			return visitor.visitSimplePathIndexer(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class SimplePathQualifiedIdentifierContext extends SimplePathContext {
	constructor(parser: tricc_cqlParser, ctx: SimplePathContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public simplePath(): SimplePathContext {
		return this.getTypedRuleContext(SimplePathContext, 0) as SimplePathContext;
	}
	public referentialIdentifier(): ReferentialIdentifierContext {
		return this.getTypedRuleContext(ReferentialIdentifierContext, 0) as ReferentialIdentifierContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitSimplePathQualifiedIdentifier) {
			return visitor.visitSimplePathQualifiedIdentifier(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class SimplePathReferentialIdentifierContext extends SimplePathContext {
	constructor(parser: tricc_cqlParser, ctx: SimplePathContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public referentialIdentifier(): ReferentialIdentifierContext {
		return this.getTypedRuleContext(ReferentialIdentifierContext, 0) as ReferentialIdentifierContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitSimplePathReferentialIdentifier) {
			return visitor.visitSimplePathReferentialIdentifier(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class SimpleLiteralContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_simpleLiteral;
	}
	public override copyFrom(ctx: SimpleLiteralContext): void {
		super.copyFrom(ctx);
	}
}
export class SimpleNumberLiteralContext extends SimpleLiteralContext {
	constructor(parser: tricc_cqlParser, ctx: SimpleLiteralContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public NUMBER(): TerminalNode {
		return this.getToken(tricc_cqlParser.NUMBER, 0);
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitSimpleNumberLiteral) {
			return visitor.visitSimpleNumberLiteral(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class SimpleStringLiteralContext extends SimpleLiteralContext {
	constructor(parser: tricc_cqlParser, ctx: SimpleLiteralContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public STRING(): TerminalNode {
		return this.getToken(tricc_cqlParser.STRING, 0);
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitSimpleStringLiteral) {
			return visitor.visitSimpleStringLiteral(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class DateTimePrecisionContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_dateTimePrecision;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitDateTimePrecision) {
			return visitor.visitDateTimePrecision(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class DateTimeComponentContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public dateTimePrecision(): DateTimePrecisionContext {
		return this.getTypedRuleContext(DateTimePrecisionContext, 0) as DateTimePrecisionContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_dateTimeComponent;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitDateTimeComponent) {
			return visitor.visitDateTimeComponent(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class PluralDateTimePrecisionContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_pluralDateTimePrecision;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitPluralDateTimePrecision) {
			return visitor.visitPluralDateTimePrecision(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class CaseExpressionItemContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_caseExpressionItem;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitCaseExpressionItem) {
			return visitor.visitCaseExpressionItem(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class DateTimePrecisionSpecifierContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public dateTimePrecision(): DateTimePrecisionContext {
		return this.getTypedRuleContext(DateTimePrecisionContext, 0) as DateTimePrecisionContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_dateTimePrecisionSpecifier;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitDateTimePrecisionSpecifier) {
			return visitor.visitDateTimePrecisionSpecifier(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class RelativeQualifierContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_relativeQualifier;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitRelativeQualifier) {
			return visitor.visitRelativeQualifier(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class OffsetRelativeQualifierContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_offsetRelativeQualifier;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitOffsetRelativeQualifier) {
			return visitor.visitOffsetRelativeQualifier(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ExclusiveRelativeQualifierContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_exclusiveRelativeQualifier;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitExclusiveRelativeQualifier) {
			return visitor.visitExclusiveRelativeQualifier(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class QuantityOffsetContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public quantity(): QuantityContext {
		return this.getTypedRuleContext(QuantityContext, 0) as QuantityContext;
	}
	public offsetRelativeQualifier(): OffsetRelativeQualifierContext {
		return this.getTypedRuleContext(OffsetRelativeQualifierContext, 0) as OffsetRelativeQualifierContext;
	}
	public exclusiveRelativeQualifier(): ExclusiveRelativeQualifierContext {
		return this.getTypedRuleContext(ExclusiveRelativeQualifierContext, 0) as ExclusiveRelativeQualifierContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_quantityOffset;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitQuantityOffset) {
			return visitor.visitQuantityOffset(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class TemporalRelationshipContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_temporalRelationship;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitTemporalRelationship) {
			return visitor.visitTemporalRelationship(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class IntervalOperatorPhraseContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_intervalOperatorPhrase;
	}
	public override copyFrom(ctx: IntervalOperatorPhraseContext): void {
		super.copyFrom(ctx);
	}
}
export class WithinIntervalOperatorPhraseContext extends IntervalOperatorPhraseContext {
	constructor(parser: tricc_cqlParser, ctx: IntervalOperatorPhraseContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public quantity(): QuantityContext {
		return this.getTypedRuleContext(QuantityContext, 0) as QuantityContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitWithinIntervalOperatorPhrase) {
			return visitor.visitWithinIntervalOperatorPhrase(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class IncludedInIntervalOperatorPhraseContext extends IntervalOperatorPhraseContext {
	constructor(parser: tricc_cqlParser, ctx: IntervalOperatorPhraseContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public dateTimePrecisionSpecifier(): DateTimePrecisionSpecifierContext {
		return this.getTypedRuleContext(DateTimePrecisionSpecifierContext, 0) as DateTimePrecisionSpecifierContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitIncludedInIntervalOperatorPhrase) {
			return visitor.visitIncludedInIntervalOperatorPhrase(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class EndsIntervalOperatorPhraseContext extends IntervalOperatorPhraseContext {
	constructor(parser: tricc_cqlParser, ctx: IntervalOperatorPhraseContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public dateTimePrecisionSpecifier(): DateTimePrecisionSpecifierContext {
		return this.getTypedRuleContext(DateTimePrecisionSpecifierContext, 0) as DateTimePrecisionSpecifierContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitEndsIntervalOperatorPhrase) {
			return visitor.visitEndsIntervalOperatorPhrase(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class ConcurrentWithIntervalOperatorPhraseContext extends IntervalOperatorPhraseContext {
	constructor(parser: tricc_cqlParser, ctx: IntervalOperatorPhraseContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public relativeQualifier(): RelativeQualifierContext {
		return this.getTypedRuleContext(RelativeQualifierContext, 0) as RelativeQualifierContext;
	}
	public dateTimePrecision(): DateTimePrecisionContext {
		return this.getTypedRuleContext(DateTimePrecisionContext, 0) as DateTimePrecisionContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitConcurrentWithIntervalOperatorPhrase) {
			return visitor.visitConcurrentWithIntervalOperatorPhrase(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class OverlapsIntervalOperatorPhraseContext extends IntervalOperatorPhraseContext {
	constructor(parser: tricc_cqlParser, ctx: IntervalOperatorPhraseContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public dateTimePrecisionSpecifier(): DateTimePrecisionSpecifierContext {
		return this.getTypedRuleContext(DateTimePrecisionSpecifierContext, 0) as DateTimePrecisionSpecifierContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitOverlapsIntervalOperatorPhrase) {
			return visitor.visitOverlapsIntervalOperatorPhrase(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class IncludesIntervalOperatorPhraseContext extends IntervalOperatorPhraseContext {
	constructor(parser: tricc_cqlParser, ctx: IntervalOperatorPhraseContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public dateTimePrecisionSpecifier(): DateTimePrecisionSpecifierContext {
		return this.getTypedRuleContext(DateTimePrecisionSpecifierContext, 0) as DateTimePrecisionSpecifierContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitIncludesIntervalOperatorPhrase) {
			return visitor.visitIncludesIntervalOperatorPhrase(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class BeforeOrAfterIntervalOperatorPhraseContext extends IntervalOperatorPhraseContext {
	constructor(parser: tricc_cqlParser, ctx: IntervalOperatorPhraseContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public temporalRelationship(): TemporalRelationshipContext {
		return this.getTypedRuleContext(TemporalRelationshipContext, 0) as TemporalRelationshipContext;
	}
	public quantityOffset(): QuantityOffsetContext {
		return this.getTypedRuleContext(QuantityOffsetContext, 0) as QuantityOffsetContext;
	}
	public dateTimePrecisionSpecifier(): DateTimePrecisionSpecifierContext {
		return this.getTypedRuleContext(DateTimePrecisionSpecifierContext, 0) as DateTimePrecisionSpecifierContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitBeforeOrAfterIntervalOperatorPhrase) {
			return visitor.visitBeforeOrAfterIntervalOperatorPhrase(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class MeetsIntervalOperatorPhraseContext extends IntervalOperatorPhraseContext {
	constructor(parser: tricc_cqlParser, ctx: IntervalOperatorPhraseContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public dateTimePrecisionSpecifier(): DateTimePrecisionSpecifierContext {
		return this.getTypedRuleContext(DateTimePrecisionSpecifierContext, 0) as DateTimePrecisionSpecifierContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitMeetsIntervalOperatorPhrase) {
			return visitor.visitMeetsIntervalOperatorPhrase(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class StartsIntervalOperatorPhraseContext extends IntervalOperatorPhraseContext {
	constructor(parser: tricc_cqlParser, ctx: IntervalOperatorPhraseContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public dateTimePrecisionSpecifier(): DateTimePrecisionSpecifierContext {
		return this.getTypedRuleContext(DateTimePrecisionSpecifierContext, 0) as DateTimePrecisionSpecifierContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitStartsIntervalOperatorPhrase) {
			return visitor.visitStartsIntervalOperatorPhrase(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class QualifiedInvocationContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_qualifiedInvocation;
	}
	public override copyFrom(ctx: QualifiedInvocationContext): void {
		super.copyFrom(ctx);
	}
}
export class QualifiedFunctionInvocationContext extends QualifiedInvocationContext {
	constructor(parser: tricc_cqlParser, ctx: QualifiedInvocationContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public qualifiedFunction(): QualifiedFunctionContext {
		return this.getTypedRuleContext(QualifiedFunctionContext, 0) as QualifiedFunctionContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitQualifiedFunctionInvocation) {
			return visitor.visitQualifiedFunctionInvocation(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class QualifiedMemberInvocationContext extends QualifiedInvocationContext {
	constructor(parser: tricc_cqlParser, ctx: QualifiedInvocationContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public referentialIdentifier(): ReferentialIdentifierContext {
		return this.getTypedRuleContext(ReferentialIdentifierContext, 0) as ReferentialIdentifierContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitQualifiedMemberInvocation) {
			return visitor.visitQualifiedMemberInvocation(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class QualifiedFunctionContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public identifierOrFunctionIdentifier(): IdentifierOrFunctionIdentifierContext {
		return this.getTypedRuleContext(IdentifierOrFunctionIdentifierContext, 0) as IdentifierOrFunctionIdentifierContext;
	}
	public paramList(): ParamListContext {
		return this.getTypedRuleContext(ParamListContext, 0) as ParamListContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_qualifiedFunction;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitQualifiedFunction) {
			return visitor.visitQualifiedFunction(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class InvocationContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_invocation;
	}
	public override copyFrom(ctx: InvocationContext): void {
		super.copyFrom(ctx);
	}
}
export class TotalInvocationContext extends InvocationContext {
	constructor(parser: tricc_cqlParser, ctx: InvocationContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitTotalInvocation) {
			return visitor.visitTotalInvocation(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class ThisInvocationContext extends InvocationContext {
	constructor(parser: tricc_cqlParser, ctx: InvocationContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitThisInvocation) {
			return visitor.visitThisInvocation(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class IndexInvocationContext extends InvocationContext {
	constructor(parser: tricc_cqlParser, ctx: InvocationContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitIndexInvocation) {
			return visitor.visitIndexInvocation(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class FunctionInvocationContext extends InvocationContext {
	constructor(parser: tricc_cqlParser, ctx: InvocationContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public function_(): FunctionContext {
		return this.getTypedRuleContext(FunctionContext, 0) as FunctionContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitFunctionInvocation) {
			return visitor.visitFunctionInvocation(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class MemberInvocationContext extends InvocationContext {
	constructor(parser: tricc_cqlParser, ctx: InvocationContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public referentialIdentifier(): ReferentialIdentifierContext {
		return this.getTypedRuleContext(ReferentialIdentifierContext, 0) as ReferentialIdentifierContext;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitMemberInvocation) {
			return visitor.visitMemberInvocation(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class FunctionContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public referentialIdentifier(): ReferentialIdentifierContext {
		return this.getTypedRuleContext(ReferentialIdentifierContext, 0) as ReferentialIdentifierContext;
	}
	public paramList(): ParamListContext {
		return this.getTypedRuleContext(ParamListContext, 0) as ParamListContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_function;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitFunction) {
			return visitor.visitFunction(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class RatioContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public quantity_list(): QuantityContext[] {
		return this.getTypedRuleContexts(QuantityContext) as QuantityContext[];
	}
	public quantity(i: number): QuantityContext {
		return this.getTypedRuleContext(QuantityContext, i) as QuantityContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_ratio;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitRatio) {
			return visitor.visitRatio(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ExternalConstantContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public keywordIdentifier(): KeywordIdentifierContext {
		return this.getTypedRuleContext(KeywordIdentifierContext, 0) as KeywordIdentifierContext;
	}
	public identifier(): IdentifierContext {
		return this.getTypedRuleContext(IdentifierContext, 0) as IdentifierContext;
	}
	public STRING(): TerminalNode {
		return this.getToken(tricc_cqlParser.STRING, 0);
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_externalConstant;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitExternalConstant) {
			return visitor.visitExternalConstant(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class IntervalSelectorContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_intervalSelector;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitIntervalSelector) {
			return visitor.visitIntervalSelector(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class TupleSelectorContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public tupleElementSelector_list(): TupleElementSelectorContext[] {
		return this.getTypedRuleContexts(TupleElementSelectorContext) as TupleElementSelectorContext[];
	}
	public tupleElementSelector(i: number): TupleElementSelectorContext {
		return this.getTypedRuleContext(TupleElementSelectorContext, i) as TupleElementSelectorContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_tupleSelector;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitTupleSelector) {
			return visitor.visitTupleSelector(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class TupleElementSelectorContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public referentialIdentifier(): ReferentialIdentifierContext {
		return this.getTypedRuleContext(ReferentialIdentifierContext, 0) as ReferentialIdentifierContext;
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_tupleElementSelector;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitTupleElementSelector) {
			return visitor.visitTupleElementSelector(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class InstanceSelectorContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public namedTypeSpecifier(): NamedTypeSpecifierContext {
		return this.getTypedRuleContext(NamedTypeSpecifierContext, 0) as NamedTypeSpecifierContext;
	}
	public instanceElementSelector_list(): InstanceElementSelectorContext[] {
		return this.getTypedRuleContexts(InstanceElementSelectorContext) as InstanceElementSelectorContext[];
	}
	public instanceElementSelector(i: number): InstanceElementSelectorContext {
		return this.getTypedRuleContext(InstanceElementSelectorContext, i) as InstanceElementSelectorContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_instanceSelector;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitInstanceSelector) {
			return visitor.visitInstanceSelector(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class InstanceElementSelectorContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public referentialIdentifier(): ReferentialIdentifierContext {
		return this.getTypedRuleContext(ReferentialIdentifierContext, 0) as ReferentialIdentifierContext;
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_instanceElementSelector;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitInstanceElementSelector) {
			return visitor.visitInstanceElementSelector(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ListSelectorContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public typeSpecifier(): TypeSpecifierContext {
		return this.getTypedRuleContext(TypeSpecifierContext, 0) as TypeSpecifierContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_listSelector;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitListSelector) {
			return visitor.visitListSelector(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class DisplayClauseContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public STRING(): TerminalNode {
		return this.getToken(tricc_cqlParser.STRING, 0);
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_displayClause;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitDisplayClause) {
			return visitor.visitDisplayClause(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class CodeSelectorContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public STRING(): TerminalNode {
		return this.getToken(tricc_cqlParser.STRING, 0);
	}
	public codesystemIdentifier(): CodesystemIdentifierContext {
		return this.getTypedRuleContext(CodesystemIdentifierContext, 0) as CodesystemIdentifierContext;
	}
	public displayClause(): DisplayClauseContext {
		return this.getTypedRuleContext(DisplayClauseContext, 0) as DisplayClauseContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_codeSelector;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitCodeSelector) {
			return visitor.visitCodeSelector(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ConceptSelectorContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public codeSelector_list(): CodeSelectorContext[] {
		return this.getTypedRuleContexts(CodeSelectorContext) as CodeSelectorContext[];
	}
	public codeSelector(i: number): CodeSelectorContext {
		return this.getTypedRuleContext(CodeSelectorContext, i) as CodeSelectorContext;
	}
	public displayClause(): DisplayClauseContext {
		return this.getTypedRuleContext(DisplayClauseContext, 0) as DisplayClauseContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_conceptSelector;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitConceptSelector) {
			return visitor.visitConceptSelector(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class KeywordContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_keyword;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitKeyword) {
			return visitor.visitKeyword(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ReservedWordContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_reservedWord;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitReservedWord) {
			return visitor.visitReservedWord(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class KeywordIdentifierContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_keywordIdentifier;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitKeywordIdentifier) {
			return visitor.visitKeywordIdentifier(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ObsoleteIdentifierContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_obsoleteIdentifier;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitObsoleteIdentifier) {
			return visitor.visitObsoleteIdentifier(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class FunctionIdentifierContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_functionIdentifier;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitFunctionIdentifier) {
			return visitor.visitFunctionIdentifier(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class TypeNameIdentifierContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_typeNameIdentifier;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitTypeNameIdentifier) {
			return visitor.visitTypeNameIdentifier(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ReferentialIdentifierContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public identifier(): IdentifierContext {
		return this.getTypedRuleContext(IdentifierContext, 0) as IdentifierContext;
	}
	public keywordIdentifier(): KeywordIdentifierContext {
		return this.getTypedRuleContext(KeywordIdentifierContext, 0) as KeywordIdentifierContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_referentialIdentifier;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitReferentialIdentifier) {
			return visitor.visitReferentialIdentifier(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ReferentialOrTypeNameIdentifierContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public referentialIdentifier(): ReferentialIdentifierContext {
		return this.getTypedRuleContext(ReferentialIdentifierContext, 0) as ReferentialIdentifierContext;
	}
	public typeNameIdentifier(): TypeNameIdentifierContext {
		return this.getTypedRuleContext(TypeNameIdentifierContext, 0) as TypeNameIdentifierContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_referentialOrTypeNameIdentifier;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitReferentialOrTypeNameIdentifier) {
			return visitor.visitReferentialOrTypeNameIdentifier(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class IdentifierOrFunctionIdentifierContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public identifier(): IdentifierContext {
		return this.getTypedRuleContext(IdentifierContext, 0) as IdentifierContext;
	}
	public functionIdentifier(): FunctionIdentifierContext {
		return this.getTypedRuleContext(FunctionIdentifierContext, 0) as FunctionIdentifierContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_identifierOrFunctionIdentifier;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitIdentifierOrFunctionIdentifier) {
			return visitor.visitIdentifierOrFunctionIdentifier(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class IdentifierContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public IDENTIFIER(): TerminalNode {
		return this.getToken(tricc_cqlParser.IDENTIFIER, 0);
	}
	public DELIMITEDIDENTIFIER(): TerminalNode {
		return this.getToken(tricc_cqlParser.DELIMITEDIDENTIFIER, 0);
	}
	public QUOTEDIDENTIFIER(): TerminalNode {
		return this.getToken(tricc_cqlParser.QUOTEDIDENTIFIER, 0);
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_identifier;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitIdentifier) {
			return visitor.visitIdentifier(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ParamListContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_paramList;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitParamList) {
			return visitor.visitParamList(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class QuantityContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public NUMBER(): TerminalNode {
		return this.getToken(tricc_cqlParser.NUMBER, 0);
	}
	public unit(): UnitContext {
		return this.getTypedRuleContext(UnitContext, 0) as UnitContext;
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_quantity;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitQuantity) {
			return visitor.visitQuantity(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class UnitContext extends ParserRuleContext {
	constructor(parser?: tricc_cqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public dateTimePrecision(): DateTimePrecisionContext {
		return this.getTypedRuleContext(DateTimePrecisionContext, 0) as DateTimePrecisionContext;
	}
	public pluralDateTimePrecision(): PluralDateTimePrecisionContext {
		return this.getTypedRuleContext(PluralDateTimePrecisionContext, 0) as PluralDateTimePrecisionContext;
	}
	public STRING(): TerminalNode {
		return this.getToken(tricc_cqlParser.STRING, 0);
	}
    public get ruleIndex(): number {
    	return tricc_cqlParser.RULE_unit;
	}
	// @Override
	public accept<Result>(visitor: tricc_cqlVisitor<Result>): Result {
		if (visitor.visitUnit) {
			return visitor.visitUnit(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
