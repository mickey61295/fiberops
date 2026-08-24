/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  14/09/2023 10.10 AM 
; =============================================  */  
 CREATE PROCEDURE SP_Qry15 (@Ordid int,@StyleNo Varchar(30)) AS
BEGIN
Select DISTINCT Mas_Acc.Acc_Descr,Mas_AccDes.AccDescription, ColorDesc,'' As ShadeNo,A.clr as ColId,'' as LabDipAppNo,A.Acc_Type,A.Acc_Desc From Pro_AccReq A
INNER JOIN Mas_Acc ON A.Acc_Type = Mas_Acc.ID INNER JOIN Mas_AccDes ON Mas_Acc.ID = Mas_AccDes.AccTypeID AND  A.Acc_Desc = Mas_AccDes.ID 
Inner Join Mas_Color On A.Clr=Mas_Color.ColId  
Where A.PrsID=16  And A.OrdId= @Ordid and a.StyleNo =@StyleNo

/*
Select DISTINCT Mas_Acc.Acc_Descr,Mas_AccDes.AccDescription, ColorDesc,IsNull(ShadeEntry.ShadeNo,'') As ShadeNo,A.clr as ColId,isNull(LabDipAppNo,'') as LabDipAppNo,A.Acc_Type,A.Acc_Desc From Pro_AccReq A
INNER JOIN Mas_Acc ON A.Acc_Type = Mas_Acc.ID INNER JOIN Mas_AccDes ON Mas_Acc.ID = Mas_AccDes.AccTypeID AND  A.Acc_Desc = Mas_AccDes.ID 
INNER Join ShadeEntry On A.OrdId=ShadeEntry.OrdId And A.PrsID=ShadeEntry.DeptId And A.Clr=ShadeEntry.ColId 
and a.Acc_Type = ShadeEntry.AccTypeid  And Acc_Desc = AccDescID and A.StyleNo = ShadeEntry.StyleNo 
Inner Join Mas_Color On A.Clr=Mas_Color.ColId  
Where A.PrsID=16  And A.OrdId= @Ordid and a.StyleNo =@StyleNo */
END
