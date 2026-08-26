




/*;=============================================   



; Author           :  Global Software's    



; Create date      :  20/12/2022    



; Create By        :  ASLAM  



; Description      :  QUERY



; Change Person    :  ASLAM



; Last Change Date :  25/03/2023 10.05 AM 



; =============================================  */  



CREATE PROCEDURE SP_RegQry4Prod (@Coycode int,@TmpOrdid nVarchar(max))



AS



BEGIN DECLARE @SQLSTR AS NVARCHAR(Max) Set @SQLSTR=N'



SELECT DISTINCT Trs_Del2.StyleNo,Isnull (Trs_Del2.StyleNo,'''') as StyleNo1 FROM dbo.Trs_Del1 INNER JOIN dbo.Trs_Del2 ON dbo.Trs_Del1.ID = dbo.Trs_Del2.ID INNER JOIN 

dbo.StockTable ON dbo.Trs_Del2.StockID = dbo.StockTable.StockID INNER JOIN  dbo.Mas_Acc ON dbo.StockTable.Atype = dbo.Mas_Acc.ID INNER JOIN

  dbo.Mas_AccDes ON dbo.StockTable.Ades = dbo.Mas_AccDes.ID INNER JOIN dbo.Mas_Uom ON Mas_Acc.UomID = dbo.Mas_Uom.UomID 

INNER JOIN dbo.OrderMas ON dbo.Trs_Del2.OrdId = dbo.OrderMas.OrdId INNER JOIN dbo.Mas_Exporter ON dbo.Trs_Del1.Coycode = dbo.Mas_Exporter.ExpID 

LEFT OUTER JOIN dbo.Mas_Color ON dbo.StockTable.ColID = dbo.Mas_Color.ColID  WHERE 

(dbo.ordermas.ordid IN ((Select ID From fnSplitter(@TmpOrdid)))) AND (dbo.Trs_Del1.TrType = -1) AND Trs_Del1.DELTYPE = ''P'' AND (dbo.StockTable.Coycode = @Coycode) 

and Trs_Del2.StyleNo is not null and trs_del2.StyleNo <> '''' order by 1'  

EXEC SP_EXECUTESQL @SQLSTR,N'@Coycode int,@TmpOrdID nVarchar(max)',@Coycode=@Coycode,@TmpOrdid=@TmpOrdid End