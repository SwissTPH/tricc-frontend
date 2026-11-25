// @ts-nocheck
// tricc-lang 1.0.0 (packages/core/src/lang/VERSION)
// Generated from tricc_cql.g4 by ANTLR 4.13.2

import { ParseTreeVisitor } from 'antlr4';


import { TriccExpressionContext } from "./tricc_cqlParser.js";
import { TimingExpressionContext } from "./tricc_cqlParser.js";
import { NotExpressionContext } from "./tricc_cqlParser.js";
import { BooleanExpressionContext } from "./tricc_cqlParser.js";
import { OrExpressionContext } from "./tricc_cqlParser.js";
import { CastExpressionContext } from "./tricc_cqlParser.js";
import { AndExpressionContext } from "./tricc_cqlParser.js";
import { BetweenExpressionContext } from "./tricc_cqlParser.js";
import { MembershipExpressionContext } from "./tricc_cqlParser.js";
import { InequalityExpressionContext } from "./tricc_cqlParser.js";
import { EqualityExpressionContext } from "./tricc_cqlParser.js";
import { ExistenceExpressionContext } from "./tricc_cqlParser.js";
import { ImpliesExpressionContext } from "./tricc_cqlParser.js";
import { NegateMembershipExpressionContext } from "./tricc_cqlParser.js";
import { TermExpressionContext } from "./tricc_cqlParser.js";
import { TypeExpressionContext } from "./tricc_cqlParser.js";
import { AdditionExpressionTermContext } from "./tricc_cqlParser.js";
import { WidthExpressionTermContext } from "./tricc_cqlParser.js";
import { SetAggregateExpressionTermContext } from "./tricc_cqlParser.js";
import { TimeUnitExpressionTermContext } from "./tricc_cqlParser.js";
import { IfThenElseExpressionTermContext } from "./tricc_cqlParser.js";
import { TimeBoundaryExpressionTermContext } from "./tricc_cqlParser.js";
import { ElementExtractorExpressionTermContext } from "./tricc_cqlParser.js";
import { ConversionExpressionTermContext } from "./tricc_cqlParser.js";
import { TypeExtentExpressionTermContext } from "./tricc_cqlParser.js";
import { PredecessorExpressionTermContext } from "./tricc_cqlParser.js";
import { PointExtractorExpressionTermContext } from "./tricc_cqlParser.js";
import { MultiplicationExpressionTermContext } from "./tricc_cqlParser.js";
import { AggregateExpressionTermContext } from "./tricc_cqlParser.js";
import { CaseExpressionTermContext } from "./tricc_cqlParser.js";
import { PowerExpressionTermContext } from "./tricc_cqlParser.js";
import { SuccessorExpressionTermContext } from "./tricc_cqlParser.js";
import { PolarityExpressionTermContext } from "./tricc_cqlParser.js";
import { TermExpressionTermContext } from "./tricc_cqlParser.js";
import { InvocationTermContext } from "./tricc_cqlParser.js";
import { LiteralTermContext } from "./tricc_cqlParser.js";
import { ExternalConstantTermContext } from "./tricc_cqlParser.js";
import { IntervalSelectorTermContext } from "./tricc_cqlParser.js";
import { TupleSelectorTermContext } from "./tricc_cqlParser.js";
import { InstanceSelectorTermContext } from "./tricc_cqlParser.js";
import { ListSelectorTermContext } from "./tricc_cqlParser.js";
import { CodeSelectorTermContext } from "./tricc_cqlParser.js";
import { ConceptSelectorTermContext } from "./tricc_cqlParser.js";
import { ParenthesizedTermContext } from "./tricc_cqlParser.js";
import { PlaceholderTermContext } from "./tricc_cqlParser.js";
import { BooleanLiteralContext } from "./tricc_cqlParser.js";
import { NullLiteralContext } from "./tricc_cqlParser.js";
import { StringLiteralContext } from "./tricc_cqlParser.js";
import { NumberLiteralContext } from "./tricc_cqlParser.js";
import { LongNumberLiteralContext } from "./tricc_cqlParser.js";
import { DateTimeLiteralContext } from "./tricc_cqlParser.js";
import { DateLiteralContext } from "./tricc_cqlParser.js";
import { TimeLiteralContext } from "./tricc_cqlParser.js";
import { DefinitionContext } from "./tricc_cqlParser.js";
import { LibraryContext } from "./tricc_cqlParser.js";
import { LibraryDefinitionContext } from "./tricc_cqlParser.js";
import { UsingDefinitionContext } from "./tricc_cqlParser.js";
import { IncludeDefinitionContext } from "./tricc_cqlParser.js";
import { LocalIdentifierContext } from "./tricc_cqlParser.js";
import { AccessModifierContext } from "./tricc_cqlParser.js";
import { ParameterDefinitionContext } from "./tricc_cqlParser.js";
import { CodesystemDefinitionContext } from "./tricc_cqlParser.js";
import { ValuesetDefinitionContext } from "./tricc_cqlParser.js";
import { CodesystemsContext } from "./tricc_cqlParser.js";
import { CodesystemIdentifierContext } from "./tricc_cqlParser.js";
import { LibraryIdentifierContext } from "./tricc_cqlParser.js";
import { CodeDefinitionContext } from "./tricc_cqlParser.js";
import { ConceptDefinitionContext } from "./tricc_cqlParser.js";
import { CodeIdentifierContext } from "./tricc_cqlParser.js";
import { CodesystemIdContext } from "./tricc_cqlParser.js";
import { ValuesetIdContext } from "./tricc_cqlParser.js";
import { VersionSpecifierContext } from "./tricc_cqlParser.js";
import { CodeIdContext } from "./tricc_cqlParser.js";
import { TypeSpecifierContext } from "./tricc_cqlParser.js";
import { NamedTypeSpecifierContext } from "./tricc_cqlParser.js";
import { ModelIdentifierContext } from "./tricc_cqlParser.js";
import { ListTypeSpecifierContext } from "./tricc_cqlParser.js";
import { IntervalTypeSpecifierContext } from "./tricc_cqlParser.js";
import { TupleTypeSpecifierContext } from "./tricc_cqlParser.js";
import { TupleElementDefinitionContext } from "./tricc_cqlParser.js";
import { ChoiceTypeSpecifierContext } from "./tricc_cqlParser.js";
import { StatementContext } from "./tricc_cqlParser.js";
import { ExpressionDefinitionContext } from "./tricc_cqlParser.js";
import { ContextDefinitionContext } from "./tricc_cqlParser.js";
import { FluentModifierContext } from "./tricc_cqlParser.js";
import { FunctionDefinitionContext } from "./tricc_cqlParser.js";
import { OperandDefinitionContext } from "./tricc_cqlParser.js";
import { FunctionBodyContext } from "./tricc_cqlParser.js";
import { QuerySourceContext } from "./tricc_cqlParser.js";
import { AliasedQuerySourceContext } from "./tricc_cqlParser.js";
import { AliasContext } from "./tricc_cqlParser.js";
import { QueryInclusionClauseContext } from "./tricc_cqlParser.js";
import { WithClauseContext } from "./tricc_cqlParser.js";
import { WithoutClauseContext } from "./tricc_cqlParser.js";
import { RetrieveContext } from "./tricc_cqlParser.js";
import { ContextIdentifierContext } from "./tricc_cqlParser.js";
import { CodePathContext } from "./tricc_cqlParser.js";
import { CodeComparatorContext } from "./tricc_cqlParser.js";
import { TerminologyContext } from "./tricc_cqlParser.js";
import { QualifierContext } from "./tricc_cqlParser.js";
import { QueryContext } from "./tricc_cqlParser.js";
import { SourceClauseContext } from "./tricc_cqlParser.js";
import { LetClauseContext } from "./tricc_cqlParser.js";
import { LetClauseItemContext } from "./tricc_cqlParser.js";
import { WhereClauseContext } from "./tricc_cqlParser.js";
import { ReturnClauseContext } from "./tricc_cqlParser.js";
import { AggregateClauseContext } from "./tricc_cqlParser.js";
import { StartingClauseContext } from "./tricc_cqlParser.js";
import { SortClauseContext } from "./tricc_cqlParser.js";
import { SortDirectionContext } from "./tricc_cqlParser.js";
import { SortByItemContext } from "./tricc_cqlParser.js";
import { QualifiedIdentifierContext } from "./tricc_cqlParser.js";
import { QualifiedIdentifierExpressionContext } from "./tricc_cqlParser.js";
import { QualifierExpressionContext } from "./tricc_cqlParser.js";
import { SimplePathIndexerContext } from "./tricc_cqlParser.js";
import { SimplePathQualifiedIdentifierContext } from "./tricc_cqlParser.js";
import { SimplePathReferentialIdentifierContext } from "./tricc_cqlParser.js";
import { SimpleStringLiteralContext } from "./tricc_cqlParser.js";
import { SimpleNumberLiteralContext } from "./tricc_cqlParser.js";
import { DateTimePrecisionContext } from "./tricc_cqlParser.js";
import { DateTimeComponentContext } from "./tricc_cqlParser.js";
import { PluralDateTimePrecisionContext } from "./tricc_cqlParser.js";
import { CaseExpressionItemContext } from "./tricc_cqlParser.js";
import { DateTimePrecisionSpecifierContext } from "./tricc_cqlParser.js";
import { RelativeQualifierContext } from "./tricc_cqlParser.js";
import { OffsetRelativeQualifierContext } from "./tricc_cqlParser.js";
import { ExclusiveRelativeQualifierContext } from "./tricc_cqlParser.js";
import { QuantityOffsetContext } from "./tricc_cqlParser.js";
import { TemporalRelationshipContext } from "./tricc_cqlParser.js";
import { ConcurrentWithIntervalOperatorPhraseContext } from "./tricc_cqlParser.js";
import { IncludesIntervalOperatorPhraseContext } from "./tricc_cqlParser.js";
import { IncludedInIntervalOperatorPhraseContext } from "./tricc_cqlParser.js";
import { BeforeOrAfterIntervalOperatorPhraseContext } from "./tricc_cqlParser.js";
import { WithinIntervalOperatorPhraseContext } from "./tricc_cqlParser.js";
import { MeetsIntervalOperatorPhraseContext } from "./tricc_cqlParser.js";
import { OverlapsIntervalOperatorPhraseContext } from "./tricc_cqlParser.js";
import { StartsIntervalOperatorPhraseContext } from "./tricc_cqlParser.js";
import { EndsIntervalOperatorPhraseContext } from "./tricc_cqlParser.js";
import { QualifiedMemberInvocationContext } from "./tricc_cqlParser.js";
import { QualifiedFunctionInvocationContext } from "./tricc_cqlParser.js";
import { QualifiedFunctionContext } from "./tricc_cqlParser.js";
import { MemberInvocationContext } from "./tricc_cqlParser.js";
import { FunctionInvocationContext } from "./tricc_cqlParser.js";
import { ThisInvocationContext } from "./tricc_cqlParser.js";
import { IndexInvocationContext } from "./tricc_cqlParser.js";
import { TotalInvocationContext } from "./tricc_cqlParser.js";
import { FunctionContext } from "./tricc_cqlParser.js";
import { RatioContext } from "./tricc_cqlParser.js";
import { ExternalConstantContext } from "./tricc_cqlParser.js";
import { IntervalSelectorContext } from "./tricc_cqlParser.js";
import { TupleSelectorContext } from "./tricc_cqlParser.js";
import { TupleElementSelectorContext } from "./tricc_cqlParser.js";
import { InstanceSelectorContext } from "./tricc_cqlParser.js";
import { InstanceElementSelectorContext } from "./tricc_cqlParser.js";
import { ListSelectorContext } from "./tricc_cqlParser.js";
import { DisplayClauseContext } from "./tricc_cqlParser.js";
import { CodeSelectorContext } from "./tricc_cqlParser.js";
import { ConceptSelectorContext } from "./tricc_cqlParser.js";
import { KeywordContext } from "./tricc_cqlParser.js";
import { ReservedWordContext } from "./tricc_cqlParser.js";
import { KeywordIdentifierContext } from "./tricc_cqlParser.js";
import { ObsoleteIdentifierContext } from "./tricc_cqlParser.js";
import { FunctionIdentifierContext } from "./tricc_cqlParser.js";
import { TypeNameIdentifierContext } from "./tricc_cqlParser.js";
import { ReferentialIdentifierContext } from "./tricc_cqlParser.js";
import { ReferentialOrTypeNameIdentifierContext } from "./tricc_cqlParser.js";
import { IdentifierOrFunctionIdentifierContext } from "./tricc_cqlParser.js";
import { IdentifierContext } from "./tricc_cqlParser.js";
import { ParamListContext } from "./tricc_cqlParser.js";
import { QuantityContext } from "./tricc_cqlParser.js";
import { UnitContext } from "./tricc_cqlParser.js";


/**
 * This interface defines a complete generic visitor for a parse tree produced
 * by `tricc_cqlParser`.
 *
 * @param <Result> The return type of the visit operation. Use `void` for
 * operations with no return type.
 */
export default class tricc_cqlVisitor<Result> extends ParseTreeVisitor<Result> {
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.triccExpression`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTriccExpression?: (ctx: TriccExpressionContext) => Result;
	/**
	 * Visit a parse tree produced by the `timingExpression`
	 * labeled alternative in `tricc_cqlParser.expression`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTimingExpression?: (ctx: TimingExpressionContext) => Result;
	/**
	 * Visit a parse tree produced by the `notExpression`
	 * labeled alternative in `tricc_cqlParser.expression`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitNotExpression?: (ctx: NotExpressionContext) => Result;
	/**
	 * Visit a parse tree produced by the `booleanExpression`
	 * labeled alternative in `tricc_cqlParser.expression`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitBooleanExpression?: (ctx: BooleanExpressionContext) => Result;
	/**
	 * Visit a parse tree produced by the `orExpression`
	 * labeled alternative in `tricc_cqlParser.expression`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitOrExpression?: (ctx: OrExpressionContext) => Result;
	/**
	 * Visit a parse tree produced by the `castExpression`
	 * labeled alternative in `tricc_cqlParser.expression`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCastExpression?: (ctx: CastExpressionContext) => Result;
	/**
	 * Visit a parse tree produced by the `andExpression`
	 * labeled alternative in `tricc_cqlParser.expression`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitAndExpression?: (ctx: AndExpressionContext) => Result;
	/**
	 * Visit a parse tree produced by the `betweenExpression`
	 * labeled alternative in `tricc_cqlParser.expression`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitBetweenExpression?: (ctx: BetweenExpressionContext) => Result;
	/**
	 * Visit a parse tree produced by the `membershipExpression`
	 * labeled alternative in `tricc_cqlParser.expression`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitMembershipExpression?: (ctx: MembershipExpressionContext) => Result;
	/**
	 * Visit a parse tree produced by the `inequalityExpression`
	 * labeled alternative in `tricc_cqlParser.expression`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitInequalityExpression?: (ctx: InequalityExpressionContext) => Result;
	/**
	 * Visit a parse tree produced by the `equalityExpression`
	 * labeled alternative in `tricc_cqlParser.expression`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitEqualityExpression?: (ctx: EqualityExpressionContext) => Result;
	/**
	 * Visit a parse tree produced by the `existenceExpression`
	 * labeled alternative in `tricc_cqlParser.expression`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExistenceExpression?: (ctx: ExistenceExpressionContext) => Result;
	/**
	 * Visit a parse tree produced by the `impliesExpression`
	 * labeled alternative in `tricc_cqlParser.expression`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitImpliesExpression?: (ctx: ImpliesExpressionContext) => Result;
	/**
	 * Visit a parse tree produced by the `negateMembershipExpression`
	 * labeled alternative in `tricc_cqlParser.expression`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitNegateMembershipExpression?: (ctx: NegateMembershipExpressionContext) => Result;
	/**
	 * Visit a parse tree produced by the `termExpression`
	 * labeled alternative in `tricc_cqlParser.expression`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTermExpression?: (ctx: TermExpressionContext) => Result;
	/**
	 * Visit a parse tree produced by the `typeExpression`
	 * labeled alternative in `tricc_cqlParser.expression`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTypeExpression?: (ctx: TypeExpressionContext) => Result;
	/**
	 * Visit a parse tree produced by the `additionExpressionTerm`
	 * labeled alternative in `tricc_cqlParser.expressionTerm`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitAdditionExpressionTerm?: (ctx: AdditionExpressionTermContext) => Result;
	/**
	 * Visit a parse tree produced by the `widthExpressionTerm`
	 * labeled alternative in `tricc_cqlParser.expressionTerm`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitWidthExpressionTerm?: (ctx: WidthExpressionTermContext) => Result;
	/**
	 * Visit a parse tree produced by the `setAggregateExpressionTerm`
	 * labeled alternative in `tricc_cqlParser.expressionTerm`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSetAggregateExpressionTerm?: (ctx: SetAggregateExpressionTermContext) => Result;
	/**
	 * Visit a parse tree produced by the `timeUnitExpressionTerm`
	 * labeled alternative in `tricc_cqlParser.expressionTerm`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTimeUnitExpressionTerm?: (ctx: TimeUnitExpressionTermContext) => Result;
	/**
	 * Visit a parse tree produced by the `ifThenElseExpressionTerm`
	 * labeled alternative in `tricc_cqlParser.expressionTerm`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitIfThenElseExpressionTerm?: (ctx: IfThenElseExpressionTermContext) => Result;
	/**
	 * Visit a parse tree produced by the `timeBoundaryExpressionTerm`
	 * labeled alternative in `tricc_cqlParser.expressionTerm`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTimeBoundaryExpressionTerm?: (ctx: TimeBoundaryExpressionTermContext) => Result;
	/**
	 * Visit a parse tree produced by the `elementExtractorExpressionTerm`
	 * labeled alternative in `tricc_cqlParser.expressionTerm`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitElementExtractorExpressionTerm?: (ctx: ElementExtractorExpressionTermContext) => Result;
	/**
	 * Visit a parse tree produced by the `conversionExpressionTerm`
	 * labeled alternative in `tricc_cqlParser.expressionTerm`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitConversionExpressionTerm?: (ctx: ConversionExpressionTermContext) => Result;
	/**
	 * Visit a parse tree produced by the `typeExtentExpressionTerm`
	 * labeled alternative in `tricc_cqlParser.expressionTerm`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTypeExtentExpressionTerm?: (ctx: TypeExtentExpressionTermContext) => Result;
	/**
	 * Visit a parse tree produced by the `predecessorExpressionTerm`
	 * labeled alternative in `tricc_cqlParser.expressionTerm`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitPredecessorExpressionTerm?: (ctx: PredecessorExpressionTermContext) => Result;
	/**
	 * Visit a parse tree produced by the `pointExtractorExpressionTerm`
	 * labeled alternative in `tricc_cqlParser.expressionTerm`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitPointExtractorExpressionTerm?: (ctx: PointExtractorExpressionTermContext) => Result;
	/**
	 * Visit a parse tree produced by the `multiplicationExpressionTerm`
	 * labeled alternative in `tricc_cqlParser.expressionTerm`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitMultiplicationExpressionTerm?: (ctx: MultiplicationExpressionTermContext) => Result;
	/**
	 * Visit a parse tree produced by the `aggregateExpressionTerm`
	 * labeled alternative in `tricc_cqlParser.expressionTerm`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitAggregateExpressionTerm?: (ctx: AggregateExpressionTermContext) => Result;
	/**
	 * Visit a parse tree produced by the `caseExpressionTerm`
	 * labeled alternative in `tricc_cqlParser.expressionTerm`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCaseExpressionTerm?: (ctx: CaseExpressionTermContext) => Result;
	/**
	 * Visit a parse tree produced by the `powerExpressionTerm`
	 * labeled alternative in `tricc_cqlParser.expressionTerm`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitPowerExpressionTerm?: (ctx: PowerExpressionTermContext) => Result;
	/**
	 * Visit a parse tree produced by the `successorExpressionTerm`
	 * labeled alternative in `tricc_cqlParser.expressionTerm`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSuccessorExpressionTerm?: (ctx: SuccessorExpressionTermContext) => Result;
	/**
	 * Visit a parse tree produced by the `polarityExpressionTerm`
	 * labeled alternative in `tricc_cqlParser.expressionTerm`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitPolarityExpressionTerm?: (ctx: PolarityExpressionTermContext) => Result;
	/**
	 * Visit a parse tree produced by the `termExpressionTerm`
	 * labeled alternative in `tricc_cqlParser.expressionTerm`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTermExpressionTerm?: (ctx: TermExpressionTermContext) => Result;
	/**
	 * Visit a parse tree produced by the `invocationTerm`
	 * labeled alternative in `tricc_cqlParser.term`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitInvocationTerm?: (ctx: InvocationTermContext) => Result;
	/**
	 * Visit a parse tree produced by the `literalTerm`
	 * labeled alternative in `tricc_cqlParser.term`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitLiteralTerm?: (ctx: LiteralTermContext) => Result;
	/**
	 * Visit a parse tree produced by the `externalConstantTerm`
	 * labeled alternative in `tricc_cqlParser.term`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExternalConstantTerm?: (ctx: ExternalConstantTermContext) => Result;
	/**
	 * Visit a parse tree produced by the `intervalSelectorTerm`
	 * labeled alternative in `tricc_cqlParser.term`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitIntervalSelectorTerm?: (ctx: IntervalSelectorTermContext) => Result;
	/**
	 * Visit a parse tree produced by the `tupleSelectorTerm`
	 * labeled alternative in `tricc_cqlParser.term`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTupleSelectorTerm?: (ctx: TupleSelectorTermContext) => Result;
	/**
	 * Visit a parse tree produced by the `instanceSelectorTerm`
	 * labeled alternative in `tricc_cqlParser.term`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitInstanceSelectorTerm?: (ctx: InstanceSelectorTermContext) => Result;
	/**
	 * Visit a parse tree produced by the `listSelectorTerm`
	 * labeled alternative in `tricc_cqlParser.term`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitListSelectorTerm?: (ctx: ListSelectorTermContext) => Result;
	/**
	 * Visit a parse tree produced by the `codeSelectorTerm`
	 * labeled alternative in `tricc_cqlParser.term`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCodeSelectorTerm?: (ctx: CodeSelectorTermContext) => Result;
	/**
	 * Visit a parse tree produced by the `conceptSelectorTerm`
	 * labeled alternative in `tricc_cqlParser.term`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitConceptSelectorTerm?: (ctx: ConceptSelectorTermContext) => Result;
	/**
	 * Visit a parse tree produced by the `parenthesizedTerm`
	 * labeled alternative in `tricc_cqlParser.term`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitParenthesizedTerm?: (ctx: ParenthesizedTermContext) => Result;
	/**
	 * Visit a parse tree produced by the `placeholderTerm`
	 * labeled alternative in `tricc_cqlParser.term`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitPlaceholderTerm?: (ctx: PlaceholderTermContext) => Result;
	/**
	 * Visit a parse tree produced by the `booleanLiteral`
	 * labeled alternative in `tricc_cqlParser.literal`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitBooleanLiteral?: (ctx: BooleanLiteralContext) => Result;
	/**
	 * Visit a parse tree produced by the `nullLiteral`
	 * labeled alternative in `tricc_cqlParser.literal`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitNullLiteral?: (ctx: NullLiteralContext) => Result;
	/**
	 * Visit a parse tree produced by the `stringLiteral`
	 * labeled alternative in `tricc_cqlParser.literal`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitStringLiteral?: (ctx: StringLiteralContext) => Result;
	/**
	 * Visit a parse tree produced by the `numberLiteral`
	 * labeled alternative in `tricc_cqlParser.literal`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitNumberLiteral?: (ctx: NumberLiteralContext) => Result;
	/**
	 * Visit a parse tree produced by the `longNumberLiteral`
	 * labeled alternative in `tricc_cqlParser.literal`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitLongNumberLiteral?: (ctx: LongNumberLiteralContext) => Result;
	/**
	 * Visit a parse tree produced by the `dateTimeLiteral`
	 * labeled alternative in `tricc_cqlParser.literal`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitDateTimeLiteral?: (ctx: DateTimeLiteralContext) => Result;
	/**
	 * Visit a parse tree produced by the `dateLiteral`
	 * labeled alternative in `tricc_cqlParser.literal`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitDateLiteral?: (ctx: DateLiteralContext) => Result;
	/**
	 * Visit a parse tree produced by the `timeLiteral`
	 * labeled alternative in `tricc_cqlParser.literal`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTimeLiteral?: (ctx: TimeLiteralContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.definition`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitDefinition?: (ctx: DefinitionContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.library`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitLibrary?: (ctx: LibraryContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.libraryDefinition`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitLibraryDefinition?: (ctx: LibraryDefinitionContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.usingDefinition`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitUsingDefinition?: (ctx: UsingDefinitionContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.includeDefinition`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitIncludeDefinition?: (ctx: IncludeDefinitionContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.localIdentifier`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitLocalIdentifier?: (ctx: LocalIdentifierContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.accessModifier`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitAccessModifier?: (ctx: AccessModifierContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.parameterDefinition`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitParameterDefinition?: (ctx: ParameterDefinitionContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.codesystemDefinition`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCodesystemDefinition?: (ctx: CodesystemDefinitionContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.valuesetDefinition`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitValuesetDefinition?: (ctx: ValuesetDefinitionContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.codesystems`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCodesystems?: (ctx: CodesystemsContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.codesystemIdentifier`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCodesystemIdentifier?: (ctx: CodesystemIdentifierContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.libraryIdentifier`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitLibraryIdentifier?: (ctx: LibraryIdentifierContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.codeDefinition`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCodeDefinition?: (ctx: CodeDefinitionContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.conceptDefinition`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitConceptDefinition?: (ctx: ConceptDefinitionContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.codeIdentifier`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCodeIdentifier?: (ctx: CodeIdentifierContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.codesystemId`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCodesystemId?: (ctx: CodesystemIdContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.valuesetId`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitValuesetId?: (ctx: ValuesetIdContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.versionSpecifier`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitVersionSpecifier?: (ctx: VersionSpecifierContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.codeId`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCodeId?: (ctx: CodeIdContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.typeSpecifier`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTypeSpecifier?: (ctx: TypeSpecifierContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.namedTypeSpecifier`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitNamedTypeSpecifier?: (ctx: NamedTypeSpecifierContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.modelIdentifier`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitModelIdentifier?: (ctx: ModelIdentifierContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.listTypeSpecifier`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitListTypeSpecifier?: (ctx: ListTypeSpecifierContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.intervalTypeSpecifier`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitIntervalTypeSpecifier?: (ctx: IntervalTypeSpecifierContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.tupleTypeSpecifier`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTupleTypeSpecifier?: (ctx: TupleTypeSpecifierContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.tupleElementDefinition`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTupleElementDefinition?: (ctx: TupleElementDefinitionContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.choiceTypeSpecifier`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitChoiceTypeSpecifier?: (ctx: ChoiceTypeSpecifierContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.statement`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitStatement?: (ctx: StatementContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.expressionDefinition`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExpressionDefinition?: (ctx: ExpressionDefinitionContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.contextDefinition`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitContextDefinition?: (ctx: ContextDefinitionContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.fluentModifier`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitFluentModifier?: (ctx: FluentModifierContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.functionDefinition`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitFunctionDefinition?: (ctx: FunctionDefinitionContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.operandDefinition`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitOperandDefinition?: (ctx: OperandDefinitionContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.functionBody`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitFunctionBody?: (ctx: FunctionBodyContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.querySource`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitQuerySource?: (ctx: QuerySourceContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.aliasedQuerySource`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitAliasedQuerySource?: (ctx: AliasedQuerySourceContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.alias`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitAlias?: (ctx: AliasContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.queryInclusionClause`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitQueryInclusionClause?: (ctx: QueryInclusionClauseContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.withClause`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitWithClause?: (ctx: WithClauseContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.withoutClause`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitWithoutClause?: (ctx: WithoutClauseContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.retrieve`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitRetrieve?: (ctx: RetrieveContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.contextIdentifier`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitContextIdentifier?: (ctx: ContextIdentifierContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.codePath`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCodePath?: (ctx: CodePathContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.codeComparator`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCodeComparator?: (ctx: CodeComparatorContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.terminology`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTerminology?: (ctx: TerminologyContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.qualifier`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitQualifier?: (ctx: QualifierContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.query`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitQuery?: (ctx: QueryContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.sourceClause`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSourceClause?: (ctx: SourceClauseContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.letClause`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitLetClause?: (ctx: LetClauseContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.letClauseItem`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitLetClauseItem?: (ctx: LetClauseItemContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.whereClause`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitWhereClause?: (ctx: WhereClauseContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.returnClause`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitReturnClause?: (ctx: ReturnClauseContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.aggregateClause`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitAggregateClause?: (ctx: AggregateClauseContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.startingClause`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitStartingClause?: (ctx: StartingClauseContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.sortClause`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSortClause?: (ctx: SortClauseContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.sortDirection`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSortDirection?: (ctx: SortDirectionContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.sortByItem`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSortByItem?: (ctx: SortByItemContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.qualifiedIdentifier`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitQualifiedIdentifier?: (ctx: QualifiedIdentifierContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.qualifiedIdentifierExpression`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitQualifiedIdentifierExpression?: (ctx: QualifiedIdentifierExpressionContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.qualifierExpression`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitQualifierExpression?: (ctx: QualifierExpressionContext) => Result;
	/**
	 * Visit a parse tree produced by the `simplePathIndexer`
	 * labeled alternative in `tricc_cqlParser.simplePath`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSimplePathIndexer?: (ctx: SimplePathIndexerContext) => Result;
	/**
	 * Visit a parse tree produced by the `simplePathQualifiedIdentifier`
	 * labeled alternative in `tricc_cqlParser.simplePath`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSimplePathQualifiedIdentifier?: (ctx: SimplePathQualifiedIdentifierContext) => Result;
	/**
	 * Visit a parse tree produced by the `simplePathReferentialIdentifier`
	 * labeled alternative in `tricc_cqlParser.simplePath`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSimplePathReferentialIdentifier?: (ctx: SimplePathReferentialIdentifierContext) => Result;
	/**
	 * Visit a parse tree produced by the `simpleStringLiteral`
	 * labeled alternative in `tricc_cqlParser.simpleLiteral`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSimpleStringLiteral?: (ctx: SimpleStringLiteralContext) => Result;
	/**
	 * Visit a parse tree produced by the `simpleNumberLiteral`
	 * labeled alternative in `tricc_cqlParser.simpleLiteral`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSimpleNumberLiteral?: (ctx: SimpleNumberLiteralContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.dateTimePrecision`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitDateTimePrecision?: (ctx: DateTimePrecisionContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.dateTimeComponent`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitDateTimeComponent?: (ctx: DateTimeComponentContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.pluralDateTimePrecision`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitPluralDateTimePrecision?: (ctx: PluralDateTimePrecisionContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.caseExpressionItem`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCaseExpressionItem?: (ctx: CaseExpressionItemContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.dateTimePrecisionSpecifier`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitDateTimePrecisionSpecifier?: (ctx: DateTimePrecisionSpecifierContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.relativeQualifier`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitRelativeQualifier?: (ctx: RelativeQualifierContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.offsetRelativeQualifier`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitOffsetRelativeQualifier?: (ctx: OffsetRelativeQualifierContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.exclusiveRelativeQualifier`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExclusiveRelativeQualifier?: (ctx: ExclusiveRelativeQualifierContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.quantityOffset`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitQuantityOffset?: (ctx: QuantityOffsetContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.temporalRelationship`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTemporalRelationship?: (ctx: TemporalRelationshipContext) => Result;
	/**
	 * Visit a parse tree produced by the `concurrentWithIntervalOperatorPhrase`
	 * labeled alternative in `tricc_cqlParser.intervalOperatorPhrase`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitConcurrentWithIntervalOperatorPhrase?: (ctx: ConcurrentWithIntervalOperatorPhraseContext) => Result;
	/**
	 * Visit a parse tree produced by the `includesIntervalOperatorPhrase`
	 * labeled alternative in `tricc_cqlParser.intervalOperatorPhrase`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitIncludesIntervalOperatorPhrase?: (ctx: IncludesIntervalOperatorPhraseContext) => Result;
	/**
	 * Visit a parse tree produced by the `includedInIntervalOperatorPhrase`
	 * labeled alternative in `tricc_cqlParser.intervalOperatorPhrase`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitIncludedInIntervalOperatorPhrase?: (ctx: IncludedInIntervalOperatorPhraseContext) => Result;
	/**
	 * Visit a parse tree produced by the `beforeOrAfterIntervalOperatorPhrase`
	 * labeled alternative in `tricc_cqlParser.intervalOperatorPhrase`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitBeforeOrAfterIntervalOperatorPhrase?: (ctx: BeforeOrAfterIntervalOperatorPhraseContext) => Result;
	/**
	 * Visit a parse tree produced by the `withinIntervalOperatorPhrase`
	 * labeled alternative in `tricc_cqlParser.intervalOperatorPhrase`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitWithinIntervalOperatorPhrase?: (ctx: WithinIntervalOperatorPhraseContext) => Result;
	/**
	 * Visit a parse tree produced by the `meetsIntervalOperatorPhrase`
	 * labeled alternative in `tricc_cqlParser.intervalOperatorPhrase`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitMeetsIntervalOperatorPhrase?: (ctx: MeetsIntervalOperatorPhraseContext) => Result;
	/**
	 * Visit a parse tree produced by the `overlapsIntervalOperatorPhrase`
	 * labeled alternative in `tricc_cqlParser.intervalOperatorPhrase`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitOverlapsIntervalOperatorPhrase?: (ctx: OverlapsIntervalOperatorPhraseContext) => Result;
	/**
	 * Visit a parse tree produced by the `startsIntervalOperatorPhrase`
	 * labeled alternative in `tricc_cqlParser.intervalOperatorPhrase`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitStartsIntervalOperatorPhrase?: (ctx: StartsIntervalOperatorPhraseContext) => Result;
	/**
	 * Visit a parse tree produced by the `endsIntervalOperatorPhrase`
	 * labeled alternative in `tricc_cqlParser.intervalOperatorPhrase`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitEndsIntervalOperatorPhrase?: (ctx: EndsIntervalOperatorPhraseContext) => Result;
	/**
	 * Visit a parse tree produced by the `qualifiedMemberInvocation`
	 * labeled alternative in `tricc_cqlParser.qualifiedInvocation`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitQualifiedMemberInvocation?: (ctx: QualifiedMemberInvocationContext) => Result;
	/**
	 * Visit a parse tree produced by the `qualifiedFunctionInvocation`
	 * labeled alternative in `tricc_cqlParser.qualifiedInvocation`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitQualifiedFunctionInvocation?: (ctx: QualifiedFunctionInvocationContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.qualifiedFunction`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitQualifiedFunction?: (ctx: QualifiedFunctionContext) => Result;
	/**
	 * Visit a parse tree produced by the `memberInvocation`
	 * labeled alternative in `tricc_cqlParser.invocation`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitMemberInvocation?: (ctx: MemberInvocationContext) => Result;
	/**
	 * Visit a parse tree produced by the `functionInvocation`
	 * labeled alternative in `tricc_cqlParser.invocation`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitFunctionInvocation?: (ctx: FunctionInvocationContext) => Result;
	/**
	 * Visit a parse tree produced by the `thisInvocation`
	 * labeled alternative in `tricc_cqlParser.invocation`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitThisInvocation?: (ctx: ThisInvocationContext) => Result;
	/**
	 * Visit a parse tree produced by the `indexInvocation`
	 * labeled alternative in `tricc_cqlParser.invocation`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitIndexInvocation?: (ctx: IndexInvocationContext) => Result;
	/**
	 * Visit a parse tree produced by the `totalInvocation`
	 * labeled alternative in `tricc_cqlParser.invocation`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTotalInvocation?: (ctx: TotalInvocationContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.function`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitFunction?: (ctx: FunctionContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.ratio`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitRatio?: (ctx: RatioContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.externalConstant`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExternalConstant?: (ctx: ExternalConstantContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.intervalSelector`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitIntervalSelector?: (ctx: IntervalSelectorContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.tupleSelector`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTupleSelector?: (ctx: TupleSelectorContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.tupleElementSelector`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTupleElementSelector?: (ctx: TupleElementSelectorContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.instanceSelector`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitInstanceSelector?: (ctx: InstanceSelectorContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.instanceElementSelector`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitInstanceElementSelector?: (ctx: InstanceElementSelectorContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.listSelector`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitListSelector?: (ctx: ListSelectorContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.displayClause`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitDisplayClause?: (ctx: DisplayClauseContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.codeSelector`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCodeSelector?: (ctx: CodeSelectorContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.conceptSelector`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitConceptSelector?: (ctx: ConceptSelectorContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.keyword`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitKeyword?: (ctx: KeywordContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.reservedWord`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitReservedWord?: (ctx: ReservedWordContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.keywordIdentifier`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitKeywordIdentifier?: (ctx: KeywordIdentifierContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.obsoleteIdentifier`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitObsoleteIdentifier?: (ctx: ObsoleteIdentifierContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.functionIdentifier`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitFunctionIdentifier?: (ctx: FunctionIdentifierContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.typeNameIdentifier`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTypeNameIdentifier?: (ctx: TypeNameIdentifierContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.referentialIdentifier`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitReferentialIdentifier?: (ctx: ReferentialIdentifierContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.referentialOrTypeNameIdentifier`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitReferentialOrTypeNameIdentifier?: (ctx: ReferentialOrTypeNameIdentifierContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.identifierOrFunctionIdentifier`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitIdentifierOrFunctionIdentifier?: (ctx: IdentifierOrFunctionIdentifierContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.identifier`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitIdentifier?: (ctx: IdentifierContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.paramList`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitParamList?: (ctx: ParamListContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.quantity`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitQuantity?: (ctx: QuantityContext) => Result;
	/**
	 * Visit a parse tree produced by `tricc_cqlParser.unit`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitUnit?: (ctx: UnitContext) => Result;
}

