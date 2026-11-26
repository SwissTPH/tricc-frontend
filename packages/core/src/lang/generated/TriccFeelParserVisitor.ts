// @ts-nocheck
// tricc-lang 1.0.0 (packages/core/src/lang/VERSION)
// Generated from TriccFeelParser.g4 by ANTLR 4.13.2

import { ParseTreeVisitor } from 'antlr4';


import { CellRootContext } from "./TriccFeelParser.js";
import { CellAnyContext } from "./TriccFeelParser.js";
import { CellNotNullContext } from "./TriccFeelParser.js";
import { CellListContext } from "./TriccFeelParser.js";
import { CellCompareContext } from "./TriccFeelParser.js";
import { CellNullContext } from "./TriccFeelParser.js";
import { CellRangeContext } from "./TriccFeelParser.js";
import { CellEqualsContext } from "./TriccFeelParser.js";
import { CellValueContext } from "./TriccFeelParser.js";


/**
 * This interface defines a complete generic visitor for a parse tree produced
 * by `TriccFeelParser`.
 *
 * @param <Result> The return type of the visit operation. Use `void` for
 * operations with no return type.
 */
export default class TriccFeelParserVisitor<Result> extends ParseTreeVisitor<Result> {
	/**
	 * Visit a parse tree produced by `TriccFeelParser.cellRoot`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCellRoot?: (ctx: CellRootContext) => Result;
	/**
	 * Visit a parse tree produced by the `cellAny`
	 * labeled alternative in `TriccFeelParser.cellTests`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCellAny?: (ctx: CellAnyContext) => Result;
	/**
	 * Visit a parse tree produced by the `cellNotNull`
	 * labeled alternative in `TriccFeelParser.cellTests`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCellNotNull?: (ctx: CellNotNullContext) => Result;
	/**
	 * Visit a parse tree produced by the `cellList`
	 * labeled alternative in `TriccFeelParser.cellTests`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCellList?: (ctx: CellListContext) => Result;
	/**
	 * Visit a parse tree produced by the `cellCompare`
	 * labeled alternative in `TriccFeelParser.cellTest`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCellCompare?: (ctx: CellCompareContext) => Result;
	/**
	 * Visit a parse tree produced by the `cellNull`
	 * labeled alternative in `TriccFeelParser.cellTest`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCellNull?: (ctx: CellNullContext) => Result;
	/**
	 * Visit a parse tree produced by the `cellRange`
	 * labeled alternative in `TriccFeelParser.cellTest`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCellRange?: (ctx: CellRangeContext) => Result;
	/**
	 * Visit a parse tree produced by the `cellEquals`
	 * labeled alternative in `TriccFeelParser.cellTest`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCellEquals?: (ctx: CellEqualsContext) => Result;
	/**
	 * Visit a parse tree produced by `TriccFeelParser.cellValue`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitCellValue?: (ctx: CellValueContext) => Result;
}

