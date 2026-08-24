/*;=============================================   
; Author           :  Global Software's    
; Create date      :  20/12/2022    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  08/04/2023 10.05 AM 
; =============================================  */  

CREATE PROCEDURE SP_Rpt_accdelaccret (@txtordid AS varchar(1000),@trtype as varchar(10), @coycode as integer, @datefrom as datetime,@dateto as datetime,@Styleno as Varchar(4000),
@AccID as Varchar(1000)) 
as begin declare  @SQLSTR AS NVARchar(4000) SET @SQLSTR= N' SELECT DISTINCT Acc_Descr,AccDescription,ColorDesc,SizeDesc,kg,Mas_Uom.Uom,ordermas.OrdId,BuyOrdNo,trs_del2.StyleNo,
Mas_Exporter.ExporterName,Jobno,DocNo,Trs_Del1.Finyear,trs_Del1.deltype,ordermas.Finyear as exp1,Trs_Del1.Dt FROM dbo.Trs_Del1 INNER JOIN dbo.Trs_Del2 ON 
dbo.Trs_Del1.ID = dbo.Trs_Del2.ID INNER JOIN dbo.StockTable ON dbo.Trs_Del2.StockID = dbo.StockTable.StockID INNER JOIN  dbo.Mas_Acc ON dbo.StockTable.Atype = dbo.Mas_Acc.ID 
INNER JOIN  dbo.Mas_AccDes ON dbo.StockTable.Ades = dbo.Mas_AccDes.ID INNER JOIN dbo.Mas_Uom ON Mas_Acc.UomID = dbo.Mas_Uom.UomID INNER JOIN dbo.OrderMas ON 
dbo.Trs_Del2.OrdId = dbo.OrderMas.OrdId INNER JOIN dbo.Mas_Exporter ON dbo.Trs_Del1.Coycode = dbo.Mas_Exporter.ExpID LEFT OUTER JOIN dbo.Mas_Color ON 
dbo.StockTable.ColID = dbo.Mas_Color.ColID LEFT OUTER JOIN Mas_Size ON StockTable.Siz = Mas_Size.SizeID  WHERE     (dbo.ordermas.ordid IN (SELECT ID FROM 
dbo.fnSplitter(@txtordid) AS fnSplitter_1)) AND (dbo.Trs_Del1.TrType = @trtype) AND (dbo.StockTable.Coycode = @coycode) and Trs_Del2.StyleNo IN (SELECT IDStr FROM 
dbo.fnSplitter_str(@Styleno) ) AND  (dbo.Mas_Acc.ID IN (SELECT ID FROM dbo.fnSplitter(@AccID))) '  if (@datefrom)<>'' Begin Set @SQLSTR=@SQLSTR+N'AND 
(Trs_del1.Dt >=@datefrom)' End if (@dateto)<>'' Begin Set @SQLSTR=@SQLSTR+N'AND 
(trs_del1.Dt <=@dateto)' End   if (@datefrom)='' AND (@dateto)='' Begin Set @SQLSTR=@SQLSTR End    BEGIN set @SQLSTR = @SQLSTR +N'order by dbo.Trs_Del1.DocNo'  end  
EXEC SP_EXECUTESQL @SQLSTR, N'@txtordid AS varchar(1000),@trtype as varchar(10), @coycode AS integer,@datefrom as datetime, @dateto as datetime,@Styleno as Varchar(4000),@AccID as Varchar(1000)',
@txtordid = @txtordid,@trtype=@trtype,@coycode =@coycode,@datefrom=@datefrom,@dateto=@dateto,@Styleno=@Styleno,@AccID=@AccID END 