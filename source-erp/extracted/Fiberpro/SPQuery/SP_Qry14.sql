/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  07/02/2023 10.00 AM 
; =============================================  */  

 CREATE PROCEDURE SP_Qry14 (@Ordid int,@coycode int,@GodId int) AS
BEGIN
   Select X.StockId,X.Acc_Descr,X.AccDescription,X.ColorDesc,X.SizeDesc,IsNull(SUM(X.SK),0) as Sk, IsNull(SUM(X.Akg),0) as aKg,isnull(Sum(X.RetKg),0) as RetKg , X.UOM,X.Atype,X.Ades,X.Colid,X.Siz,IsNull(X.Styleno,'') As Styleno,IsNull(X.Sno,0) As Sno,SUM((isnull(X.Sk,0) + isnull(X.Akg,0)) - isnull(X.RetKg,0)) as FinalStkKg  from ( SELECT StockTable.StockID, Mas_Acc.Acc_Descr, Mas_AccDes.AccDescription, Isnull(Mas_Color.ColorDesc,'') as ColorDesc,isnull(Mas_Size.SizeDesc,'') as SizeDesc, Sum(CurrentStock.Kg ) AS SK,SUM(IsNull(Vue_AccRetAck.Akg,0)) as Akg,0 As RetKg, Mas_Uom.Uom,StockTable.AType,StockTable.Ades,StockTable.ColId,StockTable.Siz,CurrentStock.StyleNo,OrdSizeMas.SNo FROM         dbo.StockTable INNER JOIN  dbo.Mas_Acc ON dbo.StockTable.Atype = dbo.Mas_Acc.ID INNER JOIN  dbo.Mas_AccDes ON dbo.StockTable.Ades = dbo.Mas_AccDes.ID INNER JOIN  dbo.Mas_Uom ON dbo.Mas_Acc.UomId = dbo.Mas_Uom.UomID INNER JOIN  dbo.CurrentStock ON dbo.StockTable.StockID = dbo.CurrentStock.StockID LEFT OUTER JOIN  dbo.Vue_AccRetAck ON dbo.StockTable.StockID = dbo.Vue_AccRetAck.StockId LEFT OUTER JOIN dbo.OrdSizeMas ON dbo.StockTable.OrdID = dbo.OrdSizeMas.OrdID and Currentstock.styleno=OrdSizeMas.StyleNo AND dbo.StockTable.Siz = dbo.OrdSizeMas.SizeID LEFT OUTER JOIN  dbo.Mas_Size ON dbo.StockTable.Siz = dbo.Mas_Size.SizeID LEFT OUTER JOIN  dbo.Mas_Color ON dbo.StockTable.ColID = dbo.Mas_Color.ColID WHERE StockTable.YF = 'A' and  CurrentStock.GodID = @GodId  and CurrentStock.Ordid=@Ordid and StockTable.Coycode=@Coycode GROUP BY StockTable.StockID, Mas_Acc.Acc_Descr, Mas_AccDes.AccDescription, Isnull(Mas_Color.ColorDesc,''),isnull(Mas_Size.SizeDesc,''), Mas_Uom.Uom,CurrentStock.StyleNo,StockTable.AType,StockTable.Ades,StockTable.ColId,StockTable.Siz , OrdSizeMas.SNo  )  X Group by X.StockId,X.Acc_Descr,X.AccDescription,X.ColorDesc,X.SizeDesc,X.UOM,X.Atype,X.Ades,X.Colid,X.Siz,X.Styleno,X.Sno Having SUM((isnull(X.Sk,0) + isnull(X.Akg,0)) - isnull(X.RetKg,0)) > 0 ORDER BY X.Acc_Descr, X.AccDescription, X.ColorDesc, X.SNo 
END
